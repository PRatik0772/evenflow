import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import { PKPass } from "passkit-generator";
import Stripe from "stripe";
import { db, eventsTable, ticketTiersTable, ordersTable, ticketsTable, usersTable, eventStaffTable, promoCodesTable } from "@workspace/db";
import { eq, sql, desc, inArray, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { sendEmail, orderConfirmationEmail, cancellationEmail } from "../lib/email.js";

const router: IRouter = Router();

const stripeKey = process.env["STRIPE_SECRET_KEY"];
if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is required");

const stripe = new Stripe(stripeKey);

// ---- Zod input schema ----
const AttendeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const TierLineSchema = z.object({
  tierId: z.string().uuid(),
  quantity: z.number().int().min(1),
  attendees: z.array(AttendeeSchema),
});

const CheckoutBodySchema = z.object({
  eventId: z.string().uuid(),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  lines: z.array(TierLineSchema).min(1),
  promoCode: z.string().optional(),
});

// POST /checkout
router.post("/checkout", async (req, res, next) => {
  try {
    const parse = CheckoutBodySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { eventId, buyerName, buyerEmail, lines, promoCode } = parse.data;

    // Validate each line's attendees count matches quantity
    for (const line of lines) {
      if (line.attendees.length !== line.quantity) {
        res.status(400).json({ error: "Attendee count must match quantity for each tier" });
        return;
      }
    }

    // Fetch event
    const eventRows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .limit(1);

    if (!eventRows[0]) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const event = eventRows[0];

    // Resolve promo code if provided
    let resolvedPromo: typeof promoCodesTable.$inferSelect | null = null;
    if (promoCode) {
      const promoRows = await db
        .select()
        .from(promoCodesTable)
        .where(and(
          eq(promoCodesTable.eventId, eventId),
          eq(promoCodesTable.code, promoCode.toUpperCase().trim()),
          eq(promoCodesTable.isActive, true),
        ))
        .limit(1);
      const promo = promoRows[0];
      if (!promo) { res.status(400).json({ error: "Invalid or inactive promo code" }); return; }
      if (promo.expiresAt && promo.expiresAt < new Date()) { res.status(400).json({ error: "Promo code has expired" }); return; }
      if (promo.maxUses != null && promo.usedCount >= promo.maxUses) { res.status(400).json({ error: "Promo code has reached its usage limit" }); return; }
      resolvedPromo = promo;
    }

    // Fetch tiers and validate in a transaction
    const result = await db.transaction(async (tx) => {
      let subtotalCents = 0;
      const tierData: Array<{ tier: typeof ticketTiersTable.$inferSelect; quantity: number; attendees: Array<{ name: string; email: string }> }> = [];

      for (const line of lines) {
        const tierRows = await tx
          .select()
          .from(ticketTiersTable)
          .where(eq(ticketTiersTable.id, line.tierId))
          .limit(1);

        const tier = tierRows[0];
        if (!tier) throw Object.assign(new Error("Tier not found"), { status: 404 });
        if (tier.eventId !== eventId) throw Object.assign(new Error("Tier does not belong to event"), { status: 400 });

        const available = tier.quantity !== null ? tier.quantity - tier.sold : Infinity;
        if (line.quantity > available) {
          throw Object.assign(new Error(`Not enough tickets available for "${tier.name}"`), { status: 409 });
        }

        // Increment sold immediately (reserve)
        await tx
          .update(ticketTiersTable)
          .set({ sold: sql`${ticketTiersTable.sold} + ${line.quantity}` })
          .where(eq(ticketTiersTable.id, line.tierId));

        subtotalCents += tier.priceCents * line.quantity;
        tierData.push({ tier, quantity: line.quantity, attendees: line.attendees });
      }

      // Apply promo discount
      let discountCents = 0;
      if (resolvedPromo) {
        if (resolvedPromo.type === "percentage") {
          discountCents = Math.round(subtotalCents * resolvedPromo.value / 100);
        } else {
          discountCents = Math.min(resolvedPromo.value, subtotalCents);
        }
        // Increment usedCount
        await tx
          .update(promoCodesTable)
          .set({ usedCount: sql`${promoCodesTable.usedCount} + 1` })
          .where(eq(promoCodesTable.id, resolvedPromo.id));
      }
      const totalCents = Math.max(0, subtotalCents - discountCents);

      // Create order
      const orderRows = await tx
        .insert(ordersTable)
        .values({
          eventId,
          buyerName,
          buyerEmail,
          totalCents,
          status: totalCents === 0 ? "paid" : "pending",
        })
        .returning();

      const order = orderRows[0]!;

      // Create tickets
      const ticketInserts = tierData.flatMap(({ tier, attendees }) =>
        attendees.map((attendee) => ({
          orderId: order.id,
          tierId: tier.id,
          tierName: tier.name,
          priceCents: tier.priceCents,
          attendeeName: attendee.name,
          attendeeEmail: attendee.email,
          qrToken: randomBytes(20).toString("hex"),
        }))
      );

      const createdTickets = await tx.insert(ticketsTable).values(ticketInserts).returning();

      return { order, tickets: createdTickets, totalCents };
    });

    // Free order — return immediately
    if (result.totalCents === 0) {
      sendEmail({
        to: result.order.buyerEmail,
        subject: `Your tickets for ${event.title}`,
        html: orderConfirmationEmail({
          buyerName: result.order.buyerName,
          eventTitle: event.title,
          eventStartAt: event.startAt.toISOString(),
          eventVenue: event.venueName,
          eventVirtualUrl: event.virtualUrl,
          orderId: result.order.id,
          totalCents: 0,
          tickets: result.tickets.map((t) => ({
            attendeeName: t.attendeeName,
            tierName: t.tierName,
            qrToken: t.qrToken,
            priceCents: t.priceCents,
          })),
        }),
      }).catch(() => {});
      res.json({
        free: true,
        orderId: result.order.id,
      });
      return;
    }

    // Build Stripe line items
    const stripeLines: Array<{
      price_data: { currency: string; unit_amount: number; product_data: { name: string } };
      quantity: number;
    }> = [];
    for (const line of lines) {
      const tier = (await db
        .select()
        .from(ticketTiersTable)
        .where(eq(ticketTiersTable.id, line.tierId))
        .limit(1))[0]!;

      stripeLines.push({
        price_data: {
          currency: "aud",
          unit_amount: tier.priceCents,
          product_data: { name: `${event.title} — ${tier.name}` },
        },
        quantity: line.quantity,
      });
    }

    // Determine base URL
    const domains = process.env["REPLIT_DOMAINS"]?.split(",")[0];
    const baseUrl = domains ? `https://${domains}` : `http://localhost:${process.env["PORT"] ?? 8080}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: stripeLines,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/e/${event.slug}`,
      customer_email: buyerEmail,
      metadata: { orderId: result.order.id },
    });

    // Store stripe session id on order
    await db
      .update(ordersTable)
      .set({ stripeSessionId: session.id })
      .where(eq(ordersTable.id, result.order.id));

    res.json({ free: false, url: session.url });
  } catch (err: any) {
    if (err?.status) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// GET /orders/:id
router.get("/orders/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!orderRows[0]) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = orderRows[0];

    const eventRows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, order.eventId))
      .limit(1);

    const event = eventRows[0];

    const tickets = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.orderId, id));

    res.json({
      id: order.id,
      status: order.status,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      totalCents: order.totalCents,
      createdAt: order.createdAt.toISOString(),
      event: event
        ? {
            id: event.id,
            title: event.title,
            slug: event.slug,
            startAt: event.startAt.toISOString(),
            venueName: event.venueName,
            venueAddress: event.venueAddress,
            virtualUrl: event.virtualUrl,
            description: event.description,
            endAt: event.endAt ? event.endAt.toISOString() : null,
          }
        : null,
      tickets: tickets.map((t) => ({
        id: t.id,
        tierName: t.tierName,
        priceCents: t.priceCents,
        attendeeName: t.attendeeName,
        attendeeEmail: t.attendeeEmail,
        qrToken: t.qrToken,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /tickets/:qrToken
router.get("/tickets/:qrToken", async (req, res, next) => {
  try {
    const qrToken = req.params.qrToken as string;

    const ticketRows = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.qrToken, qrToken))
      .limit(1);

    if (!ticketRows[0]) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const ticket = ticketRows[0];

    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, ticket.orderId))
      .limit(1);

    const order = orderRows[0];

    const eventRows = order
      ? await db
          .select()
          .from(eventsTable)
          .where(eq(eventsTable.id, order.eventId))
          .limit(1)
      : [];

    const event = eventRows[0];

    res.json({
      id: ticket.id,
      tierName: ticket.tierName,
      priceCents: ticket.priceCents,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      qrToken: ticket.qrToken,
      checkedInAt: ticket.checkedInAt?.toISOString() ?? null,
      orderStatus: order?.status ?? "unknown",
      event: event
        ? {
            id: event.id,
            title: event.title,
            slug: event.slug,
            startAt: event.startAt.toISOString(),
            endAt: event.endAt.toISOString(),
            venueName: event.venueName,
            venueAddress: event.venueAddress,
            virtualUrl: event.virtualUrl,
            description: event.description,
            bannerUrl: event.bannerUrl,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /tickets/:qrToken/checkin — mark ticket as checked in (organiser or staff)
router.post("/tickets/:qrToken/checkin", requireAuth, async (req, res, next) => {
  try {
    const qrToken = req.params.qrToken as string;

    const ticketRows = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.qrToken, qrToken))
      .limit(1);

    if (!ticketRows[0]) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const ticket = ticketRows[0];

    // Verify the caller owns the event (organiser) or is staff
    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, ticket.orderId))
      .limit(1);

    const order = orderRows[0];
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.status !== "paid") {
      res.status(400).json({ error: "Ticket has not been paid for" });
      return;
    }

    // Only organisers of this event or staff can check in
    const eventRows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, order.eventId))
      .limit(1);

    const event = eventRows[0];
    const user = req.user!;
    let allowed = user.role === "admin" || (user.role === "organiser" && event?.organiserId === user.id);
    if (!allowed && user.role === "staff" && event) {
      const staffRow = await db
        .select({ userId: eventStaffTable.userId })
        .from(eventStaffTable)
        .where(and(eq(eventStaffTable.eventId, event.id), eq(eventStaffTable.userId, user.id)))
        .limit(1);
      allowed = staffRow.length > 0;
    }
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (ticket.checkedInAt) {
      res.status(400).json({ error: `Already checked in at ${ticket.checkedInAt.toISOString()}` });
      return;
    }

    const now = new Date();
    const updated = await db
      .update(ticketsTable)
      .set({ checkedInAt: now })
      .where(eq(ticketsTable.qrToken, qrToken))
      .returning();

    const updatedTicket = updated[0]!;

    res.json({
      success: true,
      checkedInAt: now.toISOString(),
      ticket: {
        id: updatedTicket.id,
        tierName: updatedTicket.tierName,
        priceCents: updatedTicket.priceCents,
        attendeeName: updatedTicket.attendeeName,
        attendeeEmail: updatedTicket.attendeeEmail,
        qrToken: updatedTicket.qrToken,
        checkedInAt: updatedTicket.checkedInAt?.toISOString() ?? null,
        orderStatus: order.status,
        event: event
          ? {
              id: event.id,
              title: event.title,
              slug: event.slug,
              startAt: event.startAt.toISOString(),
              endAt: event.endAt.toISOString(),
              venueName: event.venueName,
              venueAddress: event.venueAddress,
              virtualUrl: event.virtualUrl,
              description: event.description,
              bannerUrl: event.bannerUrl,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /my-tickets — attendee's own tickets (matched by session email)
router.get("/my-tickets", requireAuth, async (req, res, next) => {
  try {
    const email = req.user!.email;

    // Find all paid orders for this email
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.buyerEmail, email))
      .orderBy(desc(ordersTable.createdAt));

    if (orders.length === 0) {
      res.json([]);
      return;
    }

    const orderIds = orders.map((o) => o.id);
    const eventIds = [...new Set(orders.map((o) => o.eventId))];

    const [tickets, events] = await Promise.all([
      db.select().from(ticketsTable).where(inArray(ticketsTable.orderId, orderIds)),
      db.select().from(eventsTable).where(inArray(eventsTable.id, eventIds)),
    ]);

    const eventMap = new Map(events.map((e) => [e.id, e]));
    const ticketsByOrder = new Map<string, typeof tickets>();
    for (const t of tickets) {
      const arr = ticketsByOrder.get(t.orderId) ?? [];
      arr.push(t);
      ticketsByOrder.set(t.orderId, arr);
    }

    const result = orders.map((order) => {
      const event = eventMap.get(order.eventId);
      return {
        id: order.id,
        status: order.status,
        totalCents: order.totalCents,
        createdAt: order.createdAt.toISOString(),
        event: event
          ? {
              id: event.id,
              title: event.title,
              slug: event.slug,
              startAt: event.startAt.toISOString(),
              endAt: event.endAt.toISOString(),
              venueName: event.venueName,
              venueAddress: event.venueAddress,
              virtualUrl: event.virtualUrl,
              description: event.description,
              bannerUrl: event.bannerUrl,
            }
          : null,
        tickets: (ticketsByOrder.get(order.id) ?? []).map((t) => ({
          id: t.id,
          tierName: t.tierName,
          priceCents: t.priceCents,
          attendeeName: t.attendeeName,
          attendeeEmail: t.attendeeEmail,
          qrToken: t.qrToken,
        })),
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /auth/profile — update logged-in user's name and email
const ProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

router.patch("/auth/profile", requireAuth, async (req, res, next) => {
  try {
    const parse = ProfileUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const data = parse.data;
    const newEmail = data.email?.toLowerCase().trim();

    if (newEmail && newEmail !== req.user!.email) {
      const existing = await db.select().from(usersTable).where(eq(usersTable.email, newEmail)).limit(1);
      if (existing[0]) {
        res.status(400).json({ error: "Email already in use" });
        return;
      }
    }

    const updated = await db
      .update(usersTable)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(newEmail !== undefined && { email: newEmail }),
      })
      .where(eq(usersTable.id, req.user!.id))
      .returning();

    const u = updated[0]!;
    res.json({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /tickets/:qrToken/uncheckin — undo a check-in (organiser/staff)
router.post("/tickets/:qrToken/uncheckin", requireAuth, async (req, res, next) => {
  try {
    const qrToken = req.params.qrToken as string;
    const ticketRows = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.qrToken, qrToken))
      .limit(1);
    if (!ticketRows[0]) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    const ticket = ticketRows[0];
    const orderRows = await db.select().from(ordersTable).where(eq(ordersTable.id, ticket.orderId)).limit(1);
    const order = orderRows[0];
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const eventRows = await db.select().from(eventsTable).where(eq(eventsTable.id, order.eventId)).limit(1);
    const event = eventRows[0];
    const user = req.user!;
    let allowed = user.role === "admin" || (user.role === "organiser" && event?.organiserId === user.id);
    if (!allowed && user.role === "staff" && event) {
      const staffRow = await db
        .select({ userId: eventStaffTable.userId })
        .from(eventStaffTable)
        .where(and(eq(eventStaffTable.eventId, event.id), eq(eventStaffTable.userId, user.id)))
        .limit(1);
      allowed = staffRow.length > 0;
    }
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await db
      .update(ticketsTable)
      .set({ checkedInAt: null })
      .where(eq(ticketsTable.qrToken, qrToken));
    res.json({ message: "Check-in reverted" });
  } catch (err) {
    next(err);
  }
});

// GET /find-tickets-by-email?email=… — public endpoint to recover tickets
router.get("/find-tickets-by-email", async (req, res, next) => {
  try {
    const email = typeof req.query["email"] === "string" ? req.query["email"].toLowerCase().trim() : "";
    if (!email) {
      res.status(400).json({ error: "Email required" });
      return;
    }
    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.buyerEmail, email), eq(ordersTable.status, "paid")))
      .orderBy(desc(ordersTable.createdAt));

    if (orders.length === 0) {
      res.json([]);
      return;
    }
    const orderIds = orders.map((o) => o.id);
    const eventIds = [...new Set(orders.map((o) => o.eventId))];
    const [tickets, events] = await Promise.all([
      db.select().from(ticketsTable).where(inArray(ticketsTable.orderId, orderIds)),
      db.select().from(eventsTable).where(inArray(eventsTable.id, eventIds)),
    ]);
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const ticketsByOrder = new Map<string, typeof tickets>();
    for (const t of tickets) {
      const arr = ticketsByOrder.get(t.orderId) ?? [];
      arr.push(t);
      ticketsByOrder.set(t.orderId, arr);
    }
    res.json(
      orders.map((order) => {
        const event = eventMap.get(order.eventId);
        return {
          id: order.id,
          createdAt: order.createdAt.toISOString(),
          totalCents: order.totalCents,
          event: event
            ? {
                title: event.title,
                slug: event.slug,
                startAt: event.startAt.toISOString(),
                venueName: event.venueName,
              }
            : null,
          tickets: (ticketsByOrder.get(order.id) ?? []).map((t) => ({
            id: t.id,
            tierName: t.tierName,
            attendeeName: t.attendeeName,
          })),
        };
      }),
    );
  } catch (err) {
    next(err);
  }
});

// POST /checkout/confirm-session — verify Stripe session and mark order paid
// Called by the success page so orders are confirmed even without webhook delivery
router.post("/checkout/confirm-session", requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "sessionId required" });
      return;
    }

    // Look up order by stored stripe session id
    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.stripeSessionId, sessionId))
      .limit(1);

    if (!orderRows[0]) {
      res.status(404).json({ error: "Order not found for this session" });
      return;
    }
    const order = orderRows[0];

    if (order.status === "paid") {
      res.json({ ok: true, orderId: order.id, alreadyPaid: true });
      return;
    }

    // Verify with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      res.status(402).json({
        error: "Payment not completed",
        paymentStatus: session.payment_status,
      });
      return;
    }

    await db
      .update(ordersTable)
      .set({
        status: "paid",
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    const [eventRows, ticketRows] = await Promise.all([
      db.select().from(eventsTable).where(eq(eventsTable.id, order.eventId)).limit(1),
      db.select().from(ticketsTable).where(eq(ticketsTable.orderId, order.id)),
    ]);
    const evt = eventRows[0];
    if (evt) {
      sendEmail({
        to: order.buyerEmail,
        subject: `Your tickets for ${evt.title}`,
        html: orderConfirmationEmail({
          buyerName: order.buyerName,
          eventTitle: evt.title,
          eventStartAt: evt.startAt.toISOString(),
          eventVenue: evt.venueName,
          eventVirtualUrl: evt.virtualUrl,
          orderId: order.id,
          totalCents: order.totalCents,
          tickets: ticketRows.map((t) => ({
            attendeeName: t.attendeeName,
            tierName: t.tierName,
            qrToken: t.qrToken,
            priceCents: t.priceCents,
          })),
        }),
      }).catch(() => {});
    }

    res.json({ ok: true, orderId: order.id });
  } catch (err) {
    next(err);
  }
});

// GET /tickets/:qrToken/wallet — generate Apple Wallet PKPass
router.get("/tickets/:qrToken/wallet", async (req, res, next) => {
  try {
    const {
      APPLE_WALLET_WWDR_CERT,
      APPLE_WALLET_SIGNER_CERT,
      APPLE_WALLET_SIGNER_KEY,
      APPLE_WALLET_PASS_TYPE_ID,
      APPLE_WALLET_TEAM_ID,
    } = process.env;

    if (
      !APPLE_WALLET_WWDR_CERT ||
      !APPLE_WALLET_SIGNER_CERT ||
      !APPLE_WALLET_SIGNER_KEY ||
      !APPLE_WALLET_PASS_TYPE_ID ||
      !APPLE_WALLET_TEAM_ID
    ) {
      res.status(501).json({
        error:
          "Apple Wallet is not configured. Set APPLE_WALLET_WWDR_CERT, APPLE_WALLET_SIGNER_CERT, APPLE_WALLET_SIGNER_KEY, APPLE_WALLET_PASS_TYPE_ID, and APPLE_WALLET_TEAM_ID.",
      });
      return;
    }

    const qrToken = req.params.qrToken as string;

    const ticketRows = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.qrToken, qrToken))
      .limit(1);

    if (!ticketRows[0]) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    const ticket = ticketRows[0];

    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, ticket.orderId))
      .limit(1);
    const order = orderRows[0];

    if (!order || order.status !== "paid") {
      res.status(400).json({ error: "Apple Wallet passes are only available for paid tickets." });
      return;
    }

    const eventRows = order
      ? await db.select().from(eventsTable).where(eq(eventsTable.id, order.eventId)).limit(1)
      : [];
    const event = eventRows[0];

    const startDate = event?.startAt ? new Date(event.startAt) : null;
    const dateStr = startDate
      ? startDate.toLocaleDateString("en-AU", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
      : "Date TBA";
    const timeStr = startDate
      ? startDate.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
      : "";

    const passJson = {
      passTypeIdentifier: APPLE_WALLET_PASS_TYPE_ID,
      teamIdentifier: APPLE_WALLET_TEAM_ID,
      organizationName: "EventFlow",
      description: event?.title ?? "Event Ticket",
      formatVersion: 1,
      serialNumber: ticket.id,
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(13, 13, 13)",
      labelColor: "rgb(160, 160, 160)",
      eventTicket: {
        primaryFields: [
          { key: "event", label: "EVENT", value: event?.title ?? "Event" },
        ],
        secondaryFields: [
          { key: "date", label: "DATE", value: dateStr },
          { key: "time", label: "TIME", value: timeStr },
        ],
        auxiliaryFields: [
          { key: "attendee", label: "ATTENDEE", value: ticket.attendeeName },
          { key: "tier", label: "TICKET TYPE", value: ticket.tierName },
        ],
        backFields: [
          ...(event?.venueName
            ? [{ key: "venue", label: "VENUE", value: event.venueName }]
            : []),
          ...(event?.venueAddress
            ? [{ key: "address", label: "ADDRESS", value: event.venueAddress }]
            : []),
          { key: "email", label: "EMAIL", value: ticket.attendeeEmail },
          { key: "ticketId", label: "TICKET ID", value: ticket.id.slice(-10).toUpperCase() },
        ],
      },
      barcodes: [
        {
          message: ticket.qrToken,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
        },
      ],
      barcode: {
        message: ticket.qrToken,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
      },
    };

    // Minimal valid 29×29 and 58×58 dark PNG icons (solid #0D0D0D)
    const ICON_29 =
      "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAJElEQVR4nGPgpQ1gGDV31NxRc0fNHTV31NxRc0fNHTV3UJkLAMnegCCLXNeGAAAAAElFTkSuQmCC";
    const ICON_58 =
      "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAIAAABu2d1/AAAAVklEQVR4nO3OQQ0AIAwAsRnAv1007NEQkquCzvnKvA7s1JXqSnWlulJdqa5UV6or1ZXqSnWlulJdqa5UV6or1ZXqSnWlulJdqa5UV6or1ZXqSnWlutIFFUgAmx3jZEIAAAAASUVORK5CYII=";

    const pass = new PKPass(
      {
        "pass.json": Buffer.from(JSON.stringify(passJson)),
        "icon.png": Buffer.from(ICON_29, "base64"),
        "icon@2x.png": Buffer.from(ICON_58, "base64"),
      },
      {
        wwdr: APPLE_WALLET_WWDR_CERT,
        signerCert: APPLE_WALLET_SIGNER_CERT,
        signerKey: APPLE_WALLET_SIGNER_KEY,
      },
    );

    const pkpassBuffer = pass.getAsBuffer();
    const filename = `eventflow-${ticket.id.slice(-8)}.pkpass`;

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pkpassBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;
