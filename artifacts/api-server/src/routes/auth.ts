import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, operatorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

declare module "express-session" {
  interface SessionData {
    operatorId?: number;
    role?: "admin" | "moderator" | "master";
  }
}

const router: IRouter = Router();

if (!process.env.MASTER_PASSWORD) {
  throw new Error("MASTER_PASSWORD environment variable is required");
}
if (!process.env.MODERATOR_PASSWORD) {
  throw new Error("MODERATOR_PASSWORD environment variable is required");
}

const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
const MODERATOR_PASSWORD_KEY = "moderator_password";
let moderatorPassword = process.env.MODERATOR_PASSWORD;

router.post("/auth/login", async (req, res): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: "Password required" });
    return;
  }

  if (password === MASTER_PASSWORD) {
    req.session.role = "master";
    req.session.operatorId = undefined;
    res.json({ role: "master", operatorId: null, operatorName: null });
    return;
  }

  if (password === moderatorPassword) {
    req.session.role = "moderator";
    req.session.operatorId = undefined;
    res.json({ role: "moderator", operatorId: null, operatorName: "Moderator" });
    return;
  }

  const admins = await db
    .select()
    .from(operatorsTable)
    .where(eq(operatorsTable.type, "admin"));

  for (const admin of admins) {
    if (admin.passwordHash && await bcrypt.compare(password, admin.passwordHash)) {
      req.session.role = "admin";
      req.session.operatorId = admin.id;
      res.json({ role: "admin", operatorId: admin.id, operatorName: admin.name });
      return;
    }
  }

  res.status(401).json({ error: "Invalid password" });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const { role, operatorId } = req.session;
  if (!role) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (operatorId) {
    const [op] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, operatorId));
    res.json({ role, operatorId, operatorName: op?.name ?? null });
    return;
  }

  res.json({ role, operatorId: null, operatorName: role === "moderator" ? "Moderator" : null });
});

export default router;
export { moderatorPassword };
