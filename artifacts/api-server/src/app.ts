import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { mkdirSync } from "fs";
import router from "./routes/index.js";
import webhookRouter from "./routes/webhooks.js";
import { logger } from "./lib/logger.js";
import passport from "./lib/passport.js";
import { pool } from "@workspace/db";
import { startReminderScheduler } from "./lib/reminders.js";

const uploadsDir = path.resolve(process.cwd(), "uploads");
mkdirSync(uploadsDir, { recursive: true });

const PgSession = connectPgSimple(session);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Stripe webhook needs raw body — mount before express.json
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), webhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env["SESSION_SECRET"];
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/uploads", express.static(uploadsDir));
app.use("/api", router);

startReminderScheduler();

export default app;
