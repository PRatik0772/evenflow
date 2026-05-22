import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const rows = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, email.toLowerCase()))
          .limit(1);
        const user = rows[0];
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    const user = rows[0];
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

export default passport;
