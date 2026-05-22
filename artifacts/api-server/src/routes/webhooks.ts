import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { db, ordersTable, ticketsTable, ticketTiersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const stripeKey = process.env["STRIPE_SECRET_KEY"];
const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is required");
if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is required");

const stripe = new Stripe(stripeKey);

// POST /webhooks/stripe — raw body required (mounted before express.json)
router.post("/webhooks/stripe", async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        res.json({ received: true });
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
        .where(eq(ordersTable.id, orderId));
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Find matching order by stripe payment intent id or session
      const orderRows = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.stripePaymentIntentId, paymentIntent.id))
        .limit(1);

      if (orderRows[0]) {
        const order = orderRows[0];
        await db
          .update(ordersTable)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(ordersTable.id, order.id));

        // Decrement sold back on each tier
        const tickets = await db
          .select()
          .from(ticketsTable)
          .where(eq(ticketsTable.orderId, order.id));

        // Group by tierId and count
        const tierCounts = new Map<string, number>();
        for (const ticket of tickets) {
          tierCounts.set(ticket.tierId, (tierCounts.get(ticket.tierId) ?? 0) + 1);
        }

        for (const [tierId, count] of tierCounts) {
          await db
            .update(ticketTiersTable)
            .set({ sold: sql`GREATEST(${ticketTiersTable.sold} - ${count}, 0)` })
            .where(eq(ticketTiersTable.id, tierId));
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
