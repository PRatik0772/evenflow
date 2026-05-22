import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import path from "path";
import { mkdirSync } from "fs";
import multer from "multer";
import { db, eventsTable, usersTable, ticketTiersTable, ordersTable, ticketsTable, eventStaffTable, promoCodesTable, waitlistEntriesTable, eventSpeakersTable, eventSessionsTable, eventAnnouncementsTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, desc, asc, count, sum, inArray, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { sendEmail, cancellationEmail, announcementEmail } from "../lib/email.js";
import {
  CreateEventBody,
  UpdateEventBody,
  ListEventsQueryParams,
  CreateEventTierBody,
  UpdateTierBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");
mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, randomBytes(16).toString("hex") + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
    .replace(/-$/, "");
  const suffix = randomBytes(3).toString("hex");
  return base ? `${base}-${suffix}` : suffix;
}

function formatEvent(
  event: typeof eventsTable.$inferSelect,
  organiserName: string,
) {
  return {
    id: event.id,
    organiserId: event.organiserId,
    organiserName,
    slug: event.slug,
    title: event.title,
    description: event.description,
    category: event.category,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    virtualUrl: event.virtualUrl,
    capacity: event.capacity,
    bannerUrl: event.bannerUrl,
    status: event.status,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function formatTier(tier: typeof ticketTiersTable.$inferSelect) {
  return {
    id: tier.id,
    eventId: tier.eventId,
    name: tier.name,
    priceCents: tier.priceCents,
    quantity: tier.quantity,
    sold: tier.sold,
    saleStartsAt: tier.saleStartsAt?.toISOString() ?? null,
    saleEndsAt: tier.saleEndsAt?.toISOString() ?? null,
    sortOrder: tier.sortOrder,
    createdAt: tier.createdAt.toISOString(),
    updatedAt: tier.updatedAt.toISOString(),
  };
}

// GET /events — public, published only
router.get("/events", async (req, res, next) => {
  try {
    const parse = ListEventsQueryParams.safeParse(req.query);
    const params = parse.success ? parse.data : {};

    const conditions = [eq(eventsTable.status, "published")];

    if (params.q) {
      conditions.push(ilike(eventsTable.title, `%${params.q}%`));
    }
    if (params.category) {
      conditions.push(eq(eventsTable.category, params.category));
    }
    if (params.startAfter) {
      conditions.push(gte(eventsTable.startAt, new Date(params.startAfter)));
    }
    if (params.startBefore) {
      conditions.push(lte(eventsTable.startAt, new Date(params.startBefore)));
    }

    const priceFilter = typeof req.query["priceFilter"] === "string" ? req.query["priceFilter"] : undefined;
    const sortBy = typeof req.query["sortBy"] === "string" ? req.query["sortBy"] : "startAt";

    let filteredEventIds: string[] | null = null;
    if (priceFilter === "free" || priceFilter === "paid") {
      const tierAgg = await db
        .select({
          eventId: ticketTiersTable.eventId,
          minPrice: sql<number>`min(${ticketTiersTable.priceCents})`.as("min_price"),
        })
        .from(ticketTiersTable)
        .groupBy(ticketTiersTable.eventId);
      filteredEventIds = tierAgg
        .filter((t) => (priceFilter === "free" ? t.minPrice === 0 : t.minPrice > 0))
        .map((t) => t.eventId);
      if (filteredEventIds.length === 0) {
        res.json([]);
        return;
      }
      conditions.push(inArray(eventsTable.id, filteredEventIds));
    }

    const orderClause = sortBy === "createdAt" ? desc(eventsTable.createdAt) : asc(eventsTable.startAt);

    const rows = await db
      .select({
        event: eventsTable,
        organiserName: usersTable.name,
      })
      .from(eventsTable)
      .innerJoin(usersTable, eq(eventsTable.organiserId, usersTable.id))
      .where(and(...conditions))
      .orderBy(orderClause);

    res.json(rows.map((r) => formatEvent(r.event, r.organiserName)));
  } catch (err) {
    next(err);
  }
});

// GET /events/staff — events the current user is assigned as staff for — must come before /:slug
router.get("/events/staff", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        event: eventsTable,
        organiserName: usersTable.name,
      })
      .from(eventStaffTable)
      .innerJoin(eventsTable, eq(eventStaffTable.eventId, eventsTable.id))
      .innerJoin(usersTable, eq(eventsTable.organiserId, usersTable.id))
      .where(eq(eventStaffTable.userId, req.user!.id))
      .orderBy(desc(eventsTable.startAt));

    res.json(rows.map((r) => formatEvent(r.event, r.organiserName)));
  } catch (err) {
    next(err);
  }
});

// GET /events/mine — organiser's own events (all statuses) — must come before /:slug
router.get("/events/mine", requireAuth, requireRole("organiser", "admin"), async (req, res, next) => {
  try {
    const rows = await db
      .select({
        event: eventsTable,
        organiserName: usersTable.name,
      })
      .from(eventsTable)
      .innerJoin(usersTable, eq(eventsTable.organiserId, usersTable.id))
      .where(eq(eventsTable.organiserId, req.user!.id))
      .orderBy(desc(eventsTable.createdAt));

    res.json(rows.map((r) => formatEvent(r.event, r.organiserName)));
  } catch (err) {
    next(err);
  }
});

// GET /events/:slug — public event by slug
router.get("/events/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const rows = await db
      .select({
        event: eventsTable,
        organiserName: usersTable.name,
      })
      .from(eventsTable)
      .innerJoin(usersTable, eq(eventsTable.organiserId, usersTable.id))
      .where(eq(eventsTable.slug, slug))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.json(formatEvent(rows[0].event, rows[0].organiserName));
  } catch (err) {
    next(err);
  }
});

// POST /events — create event (organiser only)
router.post(
  "/events",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const parse = CreateEventBody.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }
      const data = parse.data;
      const slug = generateSlug(data.title);

      const rows = await db
        .insert(eventsTable)
        .values({
          organiserId: req.user!.id,
          slug,
          title: data.title,
          description: data.description ?? null,
          category: data.category ?? null,
          startAt: new Date(data.startAt),
          endAt: new Date(data.endAt),
          venueName: data.venueName ?? null,
          venueAddress: data.venueAddress ?? null,
          virtualUrl: data.virtualUrl ?? null,
          capacity: data.capacity ?? null,
          status: "draft",
        })
        .returning();

      const event = rows[0]!;
      res
        .status(201)
        .json(formatEvent(event, req.user!.name));
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /events/:id/edit — update event (must own)
router.patch(
  "/events/:id/edit",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const parse = UpdateEventBody.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }

      const existing = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (!existing[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (existing[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const data = parse.data;
      const updated = await db
        .update(eventsTable)
        .set({
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.startAt !== undefined && { startAt: new Date(data.startAt) }),
          ...(data.endAt !== undefined && { endAt: new Date(data.endAt) }),
          ...(data.venueName !== undefined && { venueName: data.venueName }),
          ...(data.venueAddress !== undefined && {
            venueAddress: data.venueAddress,
          }),
          ...(data.virtualUrl !== undefined && { virtualUrl: data.virtualUrl }),
          ...(data.capacity !== undefined && { capacity: data.capacity }),
          updatedAt: new Date(),
        })
        .where(eq(eventsTable.id, id))
        .returning();

      res.json(formatEvent(updated[0]!, req.user!.name));
    } catch (err) {
      next(err);
    }
  },
);

// POST /events/:id/publish
router.post(
  "/events/:id/publish",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const existing = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (!existing[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (existing[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Require at least one tier to publish
      const tierCount = await db
        .select({ count: count() })
        .from(ticketTiersTable)
        .where(eq(ticketTiersTable.eventId, id));
      if ((tierCount[0]?.count ?? 0) === 0) {
        res.status(400).json({ error: "Add at least one ticket tier before publishing" });
        return;
      }

      const updated = await db
        .update(eventsTable)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(eventsTable.id, id))
        .returning();

      res.json(formatEvent(updated[0]!, req.user!.name));
    } catch (err) {
      next(err);
    }
  },
);

// POST /events/:id/cancel
router.post(
  "/events/:id/cancel",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const existing = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (!existing[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (existing[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const updated = await db
        .update(eventsTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(eventsTable.id, id))
        .returning();

      const cancelledEvent = updated[0]!;

      const paidOrders = await db
        .select()
        .from(ordersTable)
        .where(and(eq(ordersTable.eventId, id), eq(ordersTable.status, "paid")));

      for (const paidOrder of paidOrders) {
        sendEmail({
          to: paidOrder.buyerEmail,
          subject: `Event Cancelled: ${cancelledEvent.title}`,
          html: cancellationEmail({
            attendeeName: paidOrder.buyerName,
            eventTitle: cancelledEvent.title,
            eventStartAt: cancelledEvent.startAt.toISOString(),
          }),
        }).catch(() => {});
      }

      res.json(formatEvent(cancelledEvent, req.user!.name));
    } catch (err) {
      next(err);
    }
  },
);

// GET /events/:id/tiers — public, list tiers for an event
router.get("/events/:id/tiers", async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const event = await db
      .select({ id: eventsTable.id })
      .from(eventsTable)
      .where(eq(eventsTable.id, id))
      .limit(1);

    if (!event[0]) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const rows = await db
      .select()
      .from(ticketTiersTable)
      .where(eq(ticketTiersTable.eventId, id))
      .orderBy(asc(ticketTiersTable.sortOrder), asc(ticketTiersTable.priceCents));

    res.json(rows.map(formatTier));
  } catch (err) {
    next(err);
  }
});

// POST /events/:id/tiers — add a tier (organiser only)
router.post(
  "/events/:id/tiers",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const parse = CreateEventTierBody.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }

      const event = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (!event[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (event[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const data = parse.data;
      const rows = await db
        .insert(ticketTiersTable)
        .values({
          eventId: id,
          name: data.name,
          priceCents: data.priceCents,
          quantity: data.quantity ?? null,
          saleStartsAt: data.saleStartsAt ? new Date(data.saleStartsAt) : null,
          saleEndsAt: data.saleEndsAt ? new Date(data.saleEndsAt) : null,
          sortOrder: data.sortOrder ?? 0,
        })
        .returning();

      res.status(201).json(formatTier(rows[0]!));
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /tiers/:id — update a tier (organiser must own event)
router.patch(
  "/tiers/:id",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const parse = UpdateTierBody.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }

      const tier = await db
        .select({ tier: ticketTiersTable, organiserId: eventsTable.organiserId })
        .from(ticketTiersTable)
        .innerJoin(eventsTable, eq(ticketTiersTable.eventId, eventsTable.id))
        .where(eq(ticketTiersTable.id, id))
        .limit(1);

      if (!tier[0]) {
        res.status(404).json({ error: "Tier not found" });
        return;
      }
      if (tier[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const data = parse.data;
      // Guard: can't shrink quantity below sold
      if (data.quantity !== undefined && data.quantity !== null && data.quantity < tier[0].tier.sold) {
        res.status(400).json({ error: `Cannot reduce capacity below ${tier[0].tier.sold} (already sold)` });
        return;
      }
      const updated = await db
        .update(ticketTiersTable)
        .set({
          ...(data.name !== undefined && { name: data.name }),
          ...(data.priceCents !== undefined && { priceCents: data.priceCents }),
          ...(data.quantity !== undefined && { quantity: data.quantity }),
          ...(data.saleStartsAt !== undefined && {
            saleStartsAt: data.saleStartsAt ? new Date(data.saleStartsAt) : null,
          }),
          ...(data.saleEndsAt !== undefined && {
            saleEndsAt: data.saleEndsAt ? new Date(data.saleEndsAt) : null,
          }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
          updatedAt: new Date(),
        })
        .where(eq(ticketTiersTable.id, id))
        .returning();

      res.json(formatTier(updated[0]!));
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /tiers/:id — delete a tier (organiser must own; reject if sold > 0)
router.delete(
  "/tiers/:id",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;

      const tier = await db
        .select({ tier: ticketTiersTable, organiserId: eventsTable.organiserId })
        .from(ticketTiersTable)
        .innerJoin(eventsTable, eq(ticketTiersTable.eventId, eventsTable.id))
        .where(eq(ticketTiersTable.id, id))
        .limit(1);

      if (!tier[0]) {
        res.status(404).json({ error: "Tier not found" });
        return;
      }
      if (tier[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (tier[0].tier.sold > 0) {
        res.status(400).json({ error: "Cannot delete a tier that has sold tickets" });
        return;
      }

      await db.delete(ticketTiersTable).where(eq(ticketTiersTable.id, id));
      res.json({ message: "Tier deleted" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /events/:id/banner — multer upload (no generated hook — raw fetch on frontend)
router.post(
  "/events/:id/banner",
  requireAuth,
  requireRole("organiser", "admin"),
  upload.single("banner"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;

      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const existing = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (!existing[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (existing[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const bannerUrl = `/api/uploads/${req.file.filename}`;
      const updated = await db
        .update(eventsTable)
        .set({ bannerUrl, updatedAt: new Date() })
        .where(eq(eventsTable.id, id))
        .returning();

      res.json(formatEvent(updated[0]!, req.user!.name));
    } catch (err) {
      next(err);
    }
  },
);

// GET /events/:id/orders — attendee list for organiser (paid orders + tickets)
router.get(
  "/events/:id/orders",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;

      // Verify ownership
      const eventRows = await db
        .select({ id: eventsTable.id, organiserId: eventsTable.organiserId })
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (!eventRows[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (eventRows[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Fetch all orders for this event
      const orders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.eventId, id))
        .orderBy(desc(ordersTable.createdAt));

      if (orders.length === 0) {
        res.json({ orders: [], stats: { totalOrders: 0, paidOrders: 0, totalTickets: 0, revenueCents: 0 } });
        return;
      }

      // Fetch all tickets for these orders in one query
      const orderIds = orders.map((o) => o.id);
      const tickets = await db
        .select()
        .from(ticketsTable)
        .where(inArray(ticketsTable.orderId, orderIds));

      // Group tickets by orderId
      const ticketsByOrder = new Map<string, typeof tickets>();
      for (const ticket of tickets) {
        const existing = ticketsByOrder.get(ticket.orderId) ?? [];
        existing.push(ticket);
        ticketsByOrder.set(ticket.orderId, existing);
      }

      const paidOrders = orders.filter((o) => o.status === "paid");
      const revenueCents = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
      const totalTickets = paidOrders.reduce(
        (sum, o) => sum + (ticketsByOrder.get(o.id)?.length ?? 0),
        0
      );

      res.json({
        orders: orders.map((order) => ({
          id: order.id,
          status: order.status,
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          totalCents: order.totalCents,
          createdAt: order.createdAt.toISOString(),
          tickets: (ticketsByOrder.get(order.id) ?? []).map((t) => ({
            id: t.id,
            tierName: t.tierName,
            priceCents: t.priceCents,
            attendeeName: t.attendeeName,
            attendeeEmail: t.attendeeEmail,
            qrToken: t.qrToken,
            checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
          })),
        })),
        stats: {
          totalOrders: orders.length,
          paidOrders: paidOrders.length,
          totalTickets,
          revenueCents,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /organiser/stats — dashboard overview stats for the logged-in organiser
router.get(
  "/organiser/stats",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const organiserId = req.user!.id;

      // All events owned by this organiser
      const events = await db
        .select({ id: eventsTable.id, status: eventsTable.status })
        .from(eventsTable)
        .where(eq(eventsTable.organiserId, organiserId));

      const eventIds = events.map((e) => e.id);
      const totalEvents = events.length;
      const publishedEvents = events.filter((e) => e.status === "published").length;
      const draftEvents = events.filter((e) => e.status === "draft").length;

      if (eventIds.length === 0) {
        res.json({
          totalEvents: 0,
          publishedEvents: 0,
          draftEvents: 0,
          totalTicketsSold: 0,
          totalRevenueCents: 0,
          recentOrders: [],
        });
        return;
      }

      // Paid orders for all these events
      const paidOrders = await db
        .select({ id: ordersTable.id, totalCents: ordersTable.totalCents, eventId: ordersTable.eventId, buyerName: ordersTable.buyerName, buyerEmail: ordersTable.buyerEmail, createdAt: ordersTable.createdAt })
        .from(ordersTable)
        .where(and(inArray(ordersTable.eventId, eventIds), eq(ordersTable.status, "paid")));

      const totalRevenueCents = paidOrders.reduce((s, o) => s + o.totalCents, 0);

      // Count tickets for paid orders
      const paidOrderIds = paidOrders.map((o) => o.id);
      let totalTicketsSold = 0;
      if (paidOrderIds.length > 0) {
        const ticketCount = await db
          .select({ count: count() })
          .from(ticketsTable)
          .where(inArray(ticketsTable.orderId, paidOrderIds));
        totalTicketsSold = ticketCount[0]?.count ?? 0;
      }

      // Recent 5 paid orders
      const recentOrders = paidOrders
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((o) => ({
          id: o.id,
          buyerName: o.buyerName,
          buyerEmail: o.buyerEmail,
          totalCents: o.totalCents,
          createdAt: o.createdAt.toISOString(),
          eventId: o.eventId,
        }));

      res.json({
        totalEvents,
        publishedEvents,
        draftEvents,
        totalTicketsSold,
        totalRevenueCents,
        recentOrders,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /events/:id/clone — duplicate event + tiers as a new draft
router.post(
  "/events/:id/clone",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const existing = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
      if (!existing[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (existing[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const src = existing[0];
      const newSlug = generateSlug(`${src.title} copy`);
      const inserted = await db
        .insert(eventsTable)
        .values({
          organiserId: req.user!.id,
          slug: newSlug,
          title: `${src.title} (Copy)`,
          description: src.description,
          category: src.category,
          startAt: src.startAt,
          endAt: src.endAt,
          venueName: src.venueName,
          venueAddress: src.venueAddress,
          virtualUrl: src.virtualUrl,
          capacity: src.capacity,
          bannerUrl: src.bannerUrl,
          status: "draft",
        })
        .returning();
      const newEvent = inserted[0]!;

      // Clone tiers (reset sold to 0)
      const srcTiers = await db
        .select()
        .from(ticketTiersTable)
        .where(eq(ticketTiersTable.eventId, id));
      if (srcTiers.length > 0) {
        await db.insert(ticketTiersTable).values(
          srcTiers.map((t) => ({
            eventId: newEvent.id,
            name: t.name,
            priceCents: t.priceCents,
            quantity: t.quantity,
            saleStartsAt: t.saleStartsAt,
            saleEndsAt: t.saleEndsAt,
            sortOrder: t.sortOrder,
          })),
        );
      }

      res.status(201).json(formatEvent(newEvent, req.user!.name));
    } catch (err) {
      next(err);
    }
  },
);

// GET /events/:id/staff — list assigned staff
router.get(
  "/events/:id/staff",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const ev = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
      if (!ev[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (ev[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const rows = await db
        .select({
          userId: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          createdAt: eventStaffTable.createdAt,
        })
        .from(eventStaffTable)
        .innerJoin(usersTable, eq(eventStaffTable.userId, usersTable.id))
        .where(eq(eventStaffTable.eventId, id));
      res.json(
        rows.map((r) => ({
          userId: r.userId,
          name: r.name,
          email: r.email,
          role: r.role,
          assignedAt: r.createdAt.toISOString(),
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// POST /events/:id/staff — assign existing user as staff by email
router.post(
  "/events/:id/staff",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
      if (!email) {
        res.status(400).json({ error: "Email required" });
        return;
      }
      const ev = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
      if (!ev[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (ev[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const u = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
      if (!u[0]) {
        res.status(404).json({ error: "No EventFlow account found for that email" });
        return;
      }
      try {
        await db
          .insert(eventStaffTable)
          .values({ eventId: id, userId: u[0].id })
          .onConflictDoNothing();
      } catch {
        // ignore duplicate
      }
      res.status(201).json({
        userId: u[0].id,
        name: u[0].name,
        email: u[0].email,
        role: u[0].role,
        assignedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /events/:id/staff/:userId
router.delete(
  "/events/:id/staff/:userId",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const userId = req.params["userId"] as string;
      const ev = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
      if (!ev[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (ev[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await db
        .delete(eventStaffTable)
        .where(and(eq(eventStaffTable.eventId, id), eq(eventStaffTable.userId, userId)));
      res.json({ message: "Staff removed" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /events/:id/tier-stats — per-tier sold + revenue (organiser only)
router.get(
  "/events/:id/tier-stats",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const ev = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
      if (!ev[0]) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (ev[0].organiserId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const tiers = await db
        .select()
        .from(ticketTiersTable)
        .where(eq(ticketTiersTable.eventId, id))
        .orderBy(asc(ticketTiersTable.sortOrder));

      const tierIds = tiers.map((t) => t.id);
      let revenueMap = new Map<string, number>();
      let checkedInMap = new Map<string, number>();

      if (tierIds.length > 0) {
        const ticketStats = await db
          .select({
            tierId: ticketsTable.tierId,
            priceCents: ticketsTable.priceCents,
            checkedInAt: ticketsTable.checkedInAt,
            orderStatus: ordersTable.status,
          })
          .from(ticketsTable)
          .innerJoin(ordersTable, eq(ticketsTable.orderId, ordersTable.id))
          .where(and(inArray(ticketsTable.tierId, tierIds), eq(ordersTable.status, "paid")));

        for (const t of ticketStats) {
          revenueMap.set(t.tierId, (revenueMap.get(t.tierId) ?? 0) + t.priceCents);
          if (t.checkedInAt) {
            checkedInMap.set(t.tierId, (checkedInMap.get(t.tierId) ?? 0) + 1);
          }
        }
      }

      res.json(
        tiers.map((t) => ({
          tierId: t.id,
          name: t.name,
          priceCents: t.priceCents,
          quantity: t.quantity,
          sold: t.sold,
          revenueCents: revenueMap.get(t.id) ?? 0,
          checkedIn: checkedInMap.get(t.id) ?? 0,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ── Promo Codes ──────────────────────────────────────────────────────────────

router.get(
  "/events/:id/promo-codes",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      const codes = await db
        .select()
        .from(promoCodesTable)
        .where(eq(promoCodesTable.eventId, eventId))
        .orderBy(desc(promoCodesTable.createdAt));

      res.json(codes);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/events/:id/promo-codes",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      const { code, type, value, maxUses, expiresAt } = req.body as {
        code: string;
        type: "percentage" | "fixed";
        value: number;
        maxUses?: number;
        expiresAt?: string;
      };

      if (!code || !type || value == null) { res.status(400).json({ error: "code, type, and value are required" }); return; }
      if (type === "percentage" && (value < 1 || value > 100)) { res.status(400).json({ error: "Percentage must be 1–100" }); return; }
      if (type === "fixed" && value < 1) { res.status(400).json({ error: "Fixed discount must be at least 1 cent" }); return; }

      const [created] = await db
        .insert(promoCodesTable)
        .values({
          eventId,
          code: code.toUpperCase().trim(),
          type,
          value,
          maxUses: maxUses ?? null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      res.status(201).json(created);
    } catch (err: any) {
      if (err?.code === "23505") {
        res.status(409).json({ error: "A promo code with that name already exists for this event" });
      } else {
        next(err);
      }
    }
  },
);

router.delete(
  "/events/:id/promo-codes/:codeId",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const codeId = String(req.params["codeId"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      await db
        .delete(promoCodesTable)
        .where(and(eq(promoCodesTable.id, codeId), eq(promoCodesTable.eventId, eventId)));

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/events/:id/promo-codes/validate",
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const { code, totalCents } = req.body as { code: string; totalCents: number };
      if (!code) { res.status(400).json({ error: "code is required" }); return; }

      const promo = await db.query.promoCodesTable.findFirst({
        where: and(
          eq(promoCodesTable.eventId, eventId),
          eq(promoCodesTable.code, code.toUpperCase().trim()),
          eq(promoCodesTable.isActive, true),
        ),
      });

      if (!promo) { res.status(404).json({ error: "Promo code not found or inactive" }); return; }
      if (promo.expiresAt && promo.expiresAt < new Date()) {
        res.status(400).json({ error: "Promo code has expired" }); return;
      }
      if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
        res.status(400).json({ error: "Promo code has reached its usage limit" }); return;
      }

      const baseCents = totalCents ?? 0;
      let discountCents = 0;
      let description = "";

      if (promo.type === "percentage") {
        discountCents = Math.round(baseCents * promo.value / 100);
        description = `${promo.value}% off`;
      } else {
        discountCents = Math.min(promo.value, baseCents);
        description = `$${(promo.value / 100).toFixed(2)} off`;
      }

      res.json({ valid: true, discountCents, description, promoId: promo.id });
    } catch (err) {
      next(err);
    }
  },
);

// ── Waitlist ──────────────────────────────────────────────────────────────────

router.post(
  "/tiers/:tierId/waitlist",
  async (req, res, next): Promise<void> => {
    try {
      const tierId = String(req.params["tierId"]);
      const { name, email } = req.body as { name: string; email: string };
      if (!name || !email) { res.status(400).json({ error: "name and email are required" }); return; }

      const tier = await db.query.ticketTiersTable.findFirst({
        where: eq(ticketTiersTable.id, tierId),
      });
      if (!tier) { res.status(404).json({ error: "Tier not found" }); return; }

      await db
        .insert(waitlistEntriesTable)
        .values({ tierId, name, email: email.toLowerCase() })
        .onConflictDoNothing();

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/events/:id/waitlist",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      const tiers = await db
        .select()
        .from(ticketTiersTable)
        .where(eq(ticketTiersTable.eventId, eventId));

      const tierIds = tiers.map(t => t.id);
      if (tierIds.length === 0) { res.json([]); return; }

      const entries = await db
        .select()
        .from(waitlistEntriesTable)
        .where(inArray(waitlistEntriesTable.tierId, tierIds))
        .orderBy(asc(waitlistEntriesTable.createdAt));

      const tierMap = new Map(tiers.map(t => [t.id, t.name]));

      res.json(entries.map(e => ({ ...e, tierName: tierMap.get(e.tierId) ?? "" })));
    } catch (err) {
      next(err);
    }
  },
);

// ── Speakers ─────────────────────────────────────────────────────────────────

router.get(
  "/events/:id/speakers",
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const speakers = await db
        .select()
        .from(eventSpeakersTable)
        .where(eq(eventSpeakersTable.eventId, eventId))
        .orderBy(asc(eventSpeakersTable.createdAt));
      res.json(speakers.map(s => ({
        id: s.id, eventId: s.eventId, name: s.name,
        bio: s.bio ?? null, photoUrl: s.photoUrl ?? null,
        createdAt: s.createdAt.toISOString(),
      })));
    } catch (err) { next(err); }
  },
);

router.post(
  "/events/:id/speakers",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      const { name, bio, photoUrl } = req.body as { name: string; bio?: string; photoUrl?: string };
      if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }

      const [created] = await db.insert(eventSpeakersTable).values({
        eventId, name: name.trim(), bio: bio ?? null, photoUrl: photoUrl ?? null,
      }).returning();

      res.status(201).json({ ...created, createdAt: created!.createdAt.toISOString() });
    } catch (err) { next(err); }
  },
);

router.patch(
  "/events/:id/speakers/:speakerId",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const speakerId = String(req.params["speakerId"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      const { name, bio, photoUrl } = req.body as { name?: string; bio?: string; photoUrl?: string };
      const [updated] = await db.update(eventSpeakersTable)
        .set({
          ...(name !== undefined && { name: name.trim() }),
          ...(bio !== undefined && { bio }),
          ...(photoUrl !== undefined && { photoUrl }),
        })
        .where(and(eq(eventSpeakersTable.id, speakerId), eq(eventSpeakersTable.eventId, eventId)))
        .returning();

      if (!updated) { res.status(404).json({ error: "Speaker not found" }); return; }
      res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
    } catch (err) { next(err); }
  },
);

router.delete(
  "/events/:id/speakers/:speakerId",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const speakerId = String(req.params["speakerId"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      await db.delete(eventSpeakersTable)
        .where(and(eq(eventSpeakersTable.id, speakerId), eq(eventSpeakersTable.eventId, eventId)));
      res.json({ message: "Speaker deleted" });
    } catch (err) { next(err); }
  },
);

// ── Sessions ──────────────────────────────────────────────────────────────────

function formatSession(
  session: typeof eventSessionsTable.$inferSelect,
  speaker?: typeof eventSpeakersTable.$inferSelect | null,
) {
  return {
    id: session.id,
    eventId: session.eventId,
    speakerId: session.speakerId ?? null,
    speaker: speaker
      ? { id: speaker.id, eventId: speaker.eventId, name: speaker.name, bio: speaker.bio ?? null, photoUrl: speaker.photoUrl ?? null, createdAt: speaker.createdAt.toISOString() }
      : undefined,
    title: session.title,
    description: session.description ?? null,
    startAt: session.startAt.toISOString(),
    endAt: session.endAt.toISOString(),
    roomName: session.roomName ?? null,
    sortOrder: session.sortOrder,
    createdAt: session.createdAt.toISOString(),
  };
}

router.get(
  "/events/:id/sessions",
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const sessions = await db
        .select({ session: eventSessionsTable, speaker: eventSpeakersTable })
        .from(eventSessionsTable)
        .leftJoin(eventSpeakersTable, eq(eventSessionsTable.speakerId, eventSpeakersTable.id))
        .where(eq(eventSessionsTable.eventId, eventId))
        .orderBy(asc(eventSessionsTable.sortOrder), asc(eventSessionsTable.startAt));

      res.json(sessions.map(r => formatSession(r.session, r.speaker)));
    } catch (err) { next(err); }
  },
);

router.post(
  "/events/:id/sessions",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      const { title, description, startAt, endAt, roomName, speakerId, sortOrder } = req.body as {
        title: string; description?: string; startAt: string; endAt: string;
        roomName?: string; speakerId?: string; sortOrder?: number;
      };
      if (!title?.trim() || !startAt || !endAt) {
        res.status(400).json({ error: "title, startAt, and endAt are required" }); return;
      }

      if (speakerId) {
        const speakerRow = await db.select({ id: eventSpeakersTable.id }).from(eventSpeakersTable)
          .where(and(eq(eventSpeakersTable.id, speakerId), eq(eventSpeakersTable.eventId, eventId))).limit(1);
        if (!speakerRow.length) { res.status(400).json({ error: "Speaker not found for this event" }); return; }
      }

      const [created] = await db.insert(eventSessionsTable).values({
        eventId,
        title: title.trim(),
        description: description ?? null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        roomName: roomName ?? null,
        speakerId: speakerId ?? null,
        sortOrder: sortOrder ?? 0,
      }).returning();

      let speaker: typeof eventSpeakersTable.$inferSelect | undefined = undefined;
      if (created!.speakerId) {
        const rows = await db.select().from(eventSpeakersTable).where(eq(eventSpeakersTable.id, created!.speakerId)).limit(1);
        speaker = rows[0];
      }

      res.status(201).json(formatSession(created!, speaker));
    } catch (err) { next(err); }
  },
);

router.patch(
  "/events/:id/sessions/:sessionId",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const sessionId = String(req.params["sessionId"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      const { title, description, startAt, endAt, roomName, speakerId, sortOrder } = req.body as {
        title?: string; description?: string; startAt?: string; endAt?: string;
        roomName?: string; speakerId?: string | null; sortOrder?: number;
      };

      if (speakerId) {
        const speakerRow = await db.select({ id: eventSpeakersTable.id }).from(eventSpeakersTable)
          .where(and(eq(eventSpeakersTable.id, speakerId), eq(eventSpeakersTable.eventId, eventId))).limit(1);
        if (!speakerRow.length) { res.status(400).json({ error: "Speaker not found for this event" }); return; }
      }

      const [updated] = await db.update(eventSessionsTable)
        .set({
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description }),
          ...(startAt !== undefined && { startAt: new Date(startAt) }),
          ...(endAt !== undefined && { endAt: new Date(endAt) }),
          ...(roomName !== undefined && { roomName }),
          ...(speakerId !== undefined && { speakerId: speakerId ?? null }),
          ...(sortOrder !== undefined && { sortOrder }),
        })
        .where(and(eq(eventSessionsTable.id, sessionId), eq(eventSessionsTable.eventId, eventId)))
        .returning();

      if (!updated) { res.status(404).json({ error: "Session not found" }); return; }

      let speaker: typeof eventSpeakersTable.$inferSelect | undefined = undefined;
      if (updated.speakerId) {
        const rows = await db.select().from(eventSpeakersTable).where(eq(eventSpeakersTable.id, updated.speakerId)).limit(1);
        speaker = rows[0];
      }

      res.json(formatSession(updated, speaker));
    } catch (err) { next(err); }
  },
);

router.delete(
  "/events/:id/sessions/:sessionId",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const sessionId = String(req.params["sessionId"]);
      const event = await db.query.eventsTable.findFirst({
        where: and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, req.user!.id)),
      });
      if (!event) { res.status(404).json({ error: "Event not found" }); return; }

      await db.delete(eventSessionsTable)
        .where(and(eq(eventSessionsTable.id, sessionId), eq(eventSessionsTable.eventId, eventId)));
      res.json({ message: "Session deleted" });
    } catch (err) { next(err); }
  },
);


// GET /events/:id/announcements — list sent announcements (organiser only)
router.get(
  "/events/:id/announcements",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);
      const event = await db.select({ id: eventsTable.id, organiserId: eventsTable.organiserId })
        .from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
      if (!event[0]) { res.status(404).json({ error: "Event not found" }); return; }
      if (event[0].organiserId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }

      const rows = await db.select().from(eventAnnouncementsTable)
        .where(eq(eventAnnouncementsTable.eventId, eventId))
        .orderBy(desc(eventAnnouncementsTable.sentAt));

      res.json(rows.map(r => ({
        id: r.id,
        eventId: r.eventId,
        subject: r.subject,
        body: r.body,
        recipientCount: r.recipientCount,
        sentAt: r.sentAt.toISOString(),
      })));
    } catch (err) { next(err); }
  },
);

// POST /events/:id/announcements — send announcement to all paid attendees (organiser only)
router.post(
  "/events/:id/announcements",
  requireAuth,
  requireRole("organiser", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const eventId = String(req.params["id"]);

      const { subject, body } = req.body as { subject?: string; body?: string };
      if (!subject?.trim() || !body?.trim()) {
        res.status(400).json({ error: "Subject and body are required" }); return;
      }

      const eventRows = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
      if (!eventRows[0]) { res.status(404).json({ error: "Event not found" }); return; }
      if (eventRows[0].organiserId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }
      const event = eventRows[0];

      // Get all unique paid attendee emails from tickets (not just buyer emails — group purchases may differ)
      const paidTickets = await db
        .select({ attendeeEmail: ticketsTable.attendeeEmail, attendeeName: ticketsTable.attendeeName })
        .from(ticketsTable)
        .innerJoin(ordersTable, eq(ticketsTable.orderId, ordersTable.id))
        .where(and(eq(ordersTable.eventId, eventId), eq(ordersTable.status, "paid")));

      // Deduplicate by email
      const seen = new Set<string>();
      const recipients = paidTickets.filter(t => {
        const email = t.attendeeEmail.toLowerCase();
        if (seen.has(email)) return false;
        seen.add(email);
        return true;
      });

      // Send emails (fire and forget)
      for (const r of recipients) {
        sendEmail({
          to: r.attendeeEmail,
          subject: `[${event.title}] ${subject.trim()}`,
          html: announcementEmail({ eventTitle: event.title, subject: subject.trim(), body: body.trim() }),
        }).catch(() => {});
      }

      // Log the announcement
      const [created] = await db.insert(eventAnnouncementsTable).values({
        eventId,
        subject: subject.trim(),
        body: body.trim(),
        recipientCount: recipients.length,
      }).returning();

      res.status(201).json({
        id: created!.id,
        eventId: created!.eventId,
        subject: created!.subject,
        body: created!.body,
        recipientCount: created!.recipientCount,
        sentAt: created!.sentAt.toISOString(),
      });
    } catch (err) { next(err); }
  },
);

export default router;


