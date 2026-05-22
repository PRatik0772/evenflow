import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import passport from "../lib/passport.js";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { sendEmail, passwordResetEmail } from "../lib/email.js";

const router: IRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["attendee", "organiser"]).default("attendee"),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the terms to create an account." }) }),
});

router.post("/auth/register", async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password, name, role } = parse.data;
  void parse.data.termsAccepted;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const rows = await db
    .insert(usersTable)
    .values({ email: email.toLowerCase(), passwordHash, name, role, termsAcceptedAt: new Date() })
    .returning();
  const user = rows[0]!;

  await new Promise<void>((resolve, reject) => {
    req.logIn(user, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/auth/login", async (req, res, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";

  if (email) {
    try {
      const existing = await db
        .select({ lockedUntil: usersTable.lockedUntil })
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);
      if (existing[0]?.lockedUntil && existing[0].lockedUntil > new Date()) {
        res.status(429).json({
          error: "Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.",
        });
        return;
      }
    } catch {
    }
  }

  passport.authenticate(
    "local",
    async (err: unknown, user: Express.User | false, info: { message?: string }) => {
      if (err) {
        next(err);
        return;
      }

      if (!user) {
        if (email) {
          try {
            const row = await db
              .select({ id: usersTable.id, failedLoginAttempts: usersTable.failedLoginAttempts })
              .from(usersTable)
              .where(eq(usersTable.email, email))
              .limit(1);
            if (row[0]) {
              const attempts = (row[0].failedLoginAttempts ?? 0) + 1;
              await db
                .update(usersTable)
                .set({
                  failedLoginAttempts: attempts,
                  lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
                })
                .where(eq(usersTable.id, row[0].id));
            }
          } catch {
          }
        }
        res.status(401).json({ error: info?.message ?? "Invalid credentials" });
        return;
      }

      try {
        await db
          .update(usersTable)
          .set({ failedLoginAttempts: 0, lockedUntil: null })
          .where(eq(usersTable.id, user.id));
      } catch {
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          next(loginErr);
          return;
        }
        res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        });
      });
    },
  )(req, res, next);
});

router.post("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      next(err);
      return;
    }
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const users = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (users[0]) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(passwordResetTokensTable).values({ token, userId: users[0].id, expiresAt });

      const domains = process.env["REPLIT_DOMAINS"]?.split(",")[0];
      const appUrl = domains ? `https://${domains}` : `http://localhost:${process.env["PORT"] ?? 5000}`;
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: users[0].email,
        subject: "Reset your EventFlow password",
        html: passwordResetEmail({ name: users[0].name, resetUrl }),
      });
    }

    res.json({ message: "If that email is registered, you'll receive a reset link shortly." });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/reset-password", async (req, res, next) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!token || !password || password.length < 8) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const rows = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, token),
          gt(passwordResetTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const resetToken = rows[0];
    if (!resetToken || resetToken.usedAt) {
      res.status(400).json({ error: "This reset link is invalid or has already been used." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db
      .update(usersTable)
      .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(usersTable.id, resetToken.userId));

    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.token, token));

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
