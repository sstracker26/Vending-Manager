import { Router, type IRouter } from "express";
import { db, machinesTable, changeLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateMachineBody,
  UpdateMachineBody,
  GetMachineParams,
  UpdateMachineParams,
  DeleteMachineParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/machines", async (_req, res): Promise<void> => {
  const machines = await db.select().from(machinesTable).orderBy(machinesTable.name);
  res.json(machines.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/machines", async (req, res): Promise<void> => {
  const parsed = CreateMachineBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [machine] = await db.insert(machinesTable).values(parsed.data).returning();
  const opId = req.session?.operatorId;
  if (opId) await db.insert(changeLogsTable).values({ operatorId: opId, action: "create", entity: "machine", entityId: machine.id, details: `Created machine: ${machine.name}` });
  res.status(201).json({ ...machine, createdAt: machine.createdAt.toISOString() });
});

router.get("/machines/:id", async (req, res): Promise<void> => {
  const params = GetMachineParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [machine] = await db.select().from(machinesTable).where(eq(machinesTable.id, params.data.id));
  if (!machine) { res.status(404).json({ error: "Machine not found" }); return; }
  res.json({ ...machine, createdAt: machine.createdAt.toISOString() });
});

router.patch("/machines/:id", async (req, res): Promise<void> => {
  const params = UpdateMachineParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMachineBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.brand !== undefined) data.brand = parsed.data.brand;
  if (parsed.data.model !== undefined) data.model = parsed.data.model;
  if (parsed.data.containerCount !== undefined) data.containerCount = parsed.data.containerCount;
  if (parsed.data.rowCount !== undefined) data.rowCount = parsed.data.rowCount;
  if (parsed.data.chuteCount !== undefined) data.chuteCount = parsed.data.chuteCount;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  const [machine] = await db.update(machinesTable).set(data).where(eq(machinesTable.id, params.data.id)).returning();
  if (!machine) { res.status(404).json({ error: "Machine not found" }); return; }
  const opId = req.session?.operatorId;
  if (opId) await db.insert(changeLogsTable).values({ operatorId: opId, action: "update", entity: "machine", entityId: machine.id, details: `Updated machine: ${machine.name}` });
  res.json({ ...machine, createdAt: machine.createdAt.toISOString() });
});

router.delete("/machines/:id", async (req, res): Promise<void> => {
  const params = DeleteMachineParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [machine] = await db.delete(machinesTable).where(eq(machinesTable.id, params.data.id)).returning();
  if (!machine) { res.status(404).json({ error: "Machine not found" }); return; }
  const opId = req.session?.operatorId;
  if (opId) await db.insert(changeLogsTable).values({ operatorId: opId, action: "delete", entity: "machine", entityId: params.data.id, details: `Deleted machine: ${machine.name}` });
  res.sendStatus(204);
});

export default router;
