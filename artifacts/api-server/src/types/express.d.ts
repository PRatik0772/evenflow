import type { User } from "@workspace/db";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: Date;
      passwordHash: string;
    }
  }
}

export {};
