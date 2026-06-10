import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, operatorsTable, changeLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateOperatorBody,
  UpdateOperatorBody,
  GetOperatorParams,
  UpdateOperatorParams,
  DeleteOperatorParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toPublic(op: typeof operatorsTable.$inferSelect) {
  return { id: op.id, name: op.name, type: op.type, isActive: op.isActive, createdAt: op.createdAt.toISOString() };
}

router.get("/operators", async (_req, res): Promise<void> => {
  const ops = await db.select().from(operatorsTable).orderBy(operatorsTable.name);
  res.json(ops.map(toPublic));
});

router.post("/operators", async (req, res): Promise<void> => {
  const parsed = CreateOperatorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  let passwordHash: string | undefined;
  if (parsed.data.password) {
    passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }
  const [op] = await db.insert(operatorsTable).values({
    name: parsed.data.name,
    type: parsed.data.type,
    passwordHash: passwordHash ?? null,
    isActive: parsed.data.isActive,
  }).returning();
  const opId = req.session?.operatorId;
  if (opId) await db.insert(changeLogsTable).values({ operatorId: opId, action: "create", entity: "operator", entityId: op.id, details: `Created operator: ${op.name}` });
  res.status(201).json(toPublic(op));
});

router.get("/operators/:id", async (req, res): Promise<void> => {
  const params = GetOperatorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [op] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, params.data.id));
  if (!op) { res.status(404).json({ error: "Operator not found" }); return; }
  res.json(toPublic(op));
});

router.patch("/operators/:id", async (req, res): Promise<void> => {
  const params = UpdateOperatorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateOperatorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const sessionOpId = req.session?.operatorId;
  if (parsed.data.password != null) {
    const targetId = params.data.id;
    const sessionRole = req.session?.role;
    if (sessionRole !== "master" && sessionOpId !== targetId) {
      res.status(403).json({ error: "Admins can only change their own password" });
      return;
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.type != null) data.type = parsed.data.type;
  if (parsed.data.isActive != null) data.isActive = parsed.data.isActive;
  if (parsed.data.password != null) data.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const [op] = await db.update(operatorsTable).set(data).where(eq(operatorsTable.id, params.data.id)).returning();
  if (!op) { res.status(404).json({ error: "Operator not found" }); return; }
  if (sessionOpId) await db.insert(changeLogsTable).values({ operatorId: sessionOpId, action: "update", entity: "operator", entityId: op.id, details: `Updated operator: ${op.name}` });
  res.json(toPublic(op));
});

router.delete("/operators/:id", async (req, res): Promise<void> => {
  const params = DeleteOperatorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [op] = await db.delete(operatorsTable).where(eq(operatorsTable.id, params.data.id)).returning();
  if (!op) { res.status(404).json({ error: "Operator not found" }); return; }
  const sessionOpId = req.session?.operatorId;
  if (sessionOpId) await db.insert(changeLogsTable).values({ operatorId: sessionOpId, action: "delete", entity: "operator", entityId: params.data.id, details: `Deleted operator: ${op.name}` });
  res.sendStatus(204);
});

export default router;
