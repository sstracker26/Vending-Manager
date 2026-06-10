import { Router, type IRouter } from "express";
import { db, clientsTable, clientMachinesTable, machinesTable, changeLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateClientBody,
  UpdateClientBody,
  GetClientParams,
  UpdateClientParams,
  DeleteClientParams,
  ListClientMachinesParams,
  AssignMachineToClientParams,
  AssignMachineToClientBody,
  RemoveClientMachineParams,
} from "@workspace/api-zod";
import QRCode from "qrcode";

const router: IRouter = Router();

router.get("/clients", async (req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
  res.json(clients.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.insert(clientsTable).values(parsed.data).returning();
  const opId = req.session?.operatorId;
  if (opId) {
    await db.insert(changeLogsTable).values({ operatorId: opId, action: "create", entity: "client", entityId: client.id, details: `Created client: ${client.name}` });
  }
  res.status(201).json({ ...client, createdAt: client.createdAt.toISOString() });
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  res.json({ ...client, createdAt: client.createdAt.toISOString() });
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.address !== undefined) data.address = parsed.data.address;
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
  if (parsed.data.hasContract != null) data.hasContract = parsed.data.hasContract;
  if (parsed.data.contractStartDate !== undefined) data.contractStartDate = parsed.data.contractStartDate;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  const [client] = await db.update(clientsTable).set(data).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  const opId = req.session?.operatorId;
  if (opId) {
    await db.insert(changeLogsTable).values({ operatorId: opId, action: "update", entity: "client", entityId: client.id, details: `Updated client: ${client.name}` });
  }
  res.json({ ...client, createdAt: client.createdAt.toISOString() });
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [client] = await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  const opId = req.session?.operatorId;
  if (opId) {
    await db.insert(changeLogsTable).values({ operatorId: opId, action: "delete", entity: "client", entityId: params.data.id, details: `Deleted client: ${client.name}` });
  }
  res.sendStatus(204);
});

router.get("/clients/:id/machines", async (req, res): Promise<void> => {
  const params = ListClientMachinesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const rows = await db
    .select({
      cm: clientMachinesTable,
      m: machinesTable,
      c: clientsTable,
    })
    .from(clientMachinesTable)
    .innerJoin(machinesTable, eq(clientMachinesTable.machineId, machinesTable.id))
    .innerJoin(clientsTable, eq(clientMachinesTable.clientId, clientsTable.id))
    .where(eq(clientMachinesTable.clientId, params.data.id));

  res.json(rows.map(r => ({
    id: r.cm.id,
    clientId: r.cm.clientId,
    clientName: r.c.name,
    machineId: r.cm.machineId,
    machineName: r.m.name,
    machineType: r.m.type,
    machineNumber: r.cm.machineNumber,
    installedAt: r.cm.installedAt ?? null,
    isActive: r.cm.isActive,
    qrCode: r.cm.qrCode ?? null,
  })));
});

router.post("/clients/:id/machines", async (req, res): Promise<void> => {
  const params = AssignMachineToClientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = AssignMachineToClientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [machine] = await db.select().from(machinesTable).where(eq(machinesTable.id, parsed.data.machineId));
  if (!machine) { res.status(404).json({ error: "Machine not found" }); return; }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const [cm] = await db.insert(clientMachinesTable).values({
    clientId: params.data.id,
    machineId: parsed.data.machineId,
    machineNumber: parsed.data.machineNumber,
    installedAt: parsed.data.installedAt ?? null,
    isActive: true,
  }).returning();

  const appUrl = process.env.APP_URL ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost"}`;
  const qrUrl = `${appUrl}/?clientId=${params.data.id}&machineId=${cm.id}`;
  const qrCode = await QRCode.toDataURL(qrUrl);
  const [updated] = await db.update(clientMachinesTable).set({ qrCode }).where(eq(clientMachinesTable.id, cm.id)).returning();

  res.status(201).json({
    id: updated.id,
    clientId: updated.clientId,
    clientName: client.name,
    machineId: updated.machineId,
    machineName: machine.name,
    machineType: machine.type,
    machineNumber: updated.machineNumber,
    installedAt: updated.installedAt ?? null,
    isActive: updated.isActive,
    qrCode: updated.qrCode ?? null,
  });
});

router.delete("/clients/:clientId/machines/:machineId", async (req, res): Promise<void> => {
  const params = RemoveClientMachineParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [cm] = await db.delete(clientMachinesTable)
    .where(and(eq(clientMachinesTable.clientId, params.data.clientId), eq(clientMachinesTable.id, params.data.machineId)))
    .returning();
  if (!cm) { res.status(404).json({ error: "Client machine not found" }); return; }
  res.sendStatus(204);
});

export default router;
