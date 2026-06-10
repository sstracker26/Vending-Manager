import { Router, type IRouter } from "express";
import { db, schedulesTable, clientsTable, machineLoadsTable, clientMachinesTable, changeLogsTable } from "@workspace/db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import {
  CreateScheduleBody,
  DeleteScheduleParams,
  GetScheduleExecutionQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

router.get("/schedules", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ s: schedulesTable, c: clientsTable })
    .from(schedulesTable)
    .innerJoin(clientsTable, eq(schedulesTable.clientId, clientsTable.id))
    .orderBy(schedulesTable.dayOfWeek);

  res.json(rows.map(r => ({
    id: r.s.id,
    clientId: r.s.clientId,
    clientName: r.c.name,
    dayOfWeek: r.s.dayOfWeek,
    createdAt: r.s.createdAt.toISOString(),
  })));
});

router.post("/schedules", async (req, res): Promise<void> => {
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const [schedule] = await db.insert(schedulesTable).values(parsed.data).returning();
  const opId = req.session?.operatorId;
  if (opId) await db.insert(changeLogsTable).values({ operatorId: opId, action: "create", entity: "schedule", entityId: schedule.id, details: `Scheduled ${client.name} on ${DAY_NAMES[schedule.dayOfWeek]}` });
  res.status(201).json({ id: schedule.id, clientId: schedule.clientId, clientName: client.name, dayOfWeek: schedule.dayOfWeek, createdAt: schedule.createdAt.toISOString() });
});

router.delete("/schedules/:id", async (req, res): Promise<void> => {
  const params = DeleteScheduleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [s] = await db.delete(schedulesTable).where(eq(schedulesTable.id, params.data.id)).returning();
  if (!s) { res.status(404).json({ error: "Schedule not found" }); return; }
  res.sendStatus(204);
});

router.get("/schedules/execution", async (req, res): Promise<void> => {
  const qp = GetScheduleExecutionQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }

  // Get all schedules
  const schedules = await db
    .select({ s: schedulesTable, c: clientsTable })
    .from(schedulesTable)
    .innerJoin(clientsTable, eq(schedulesTable.clientId, clientsTable.id));

  const nowBulgaria = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Sofia" }));
  const currentDow = nowBulgaria.getDay();
  const mondayOffset = (currentDow === 0 ? -6 : 1 - currentDow);
  const weekStart = new Date(nowBulgaria);
  weekStart.setDate(nowBulgaria.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const fromDate = qp.data.dateFrom ? new Date(qp.data.dateFrom) : weekStart;
  const toDate = qp.data.dateTo ? new Date(qp.data.dateTo + "T23:59:59") : weekEnd;

  const result = [];
  for (const { s, c } of schedules) {
    const scheduledDate = new Date(fromDate);
    const dayOfWeek = s.dayOfWeek;
    const dow = fromDate.getDay();
    const diff = (dayOfWeek - dow + 7) % 7;
    scheduledDate.setDate(fromDate.getDate() + diff);

    if (scheduledDate > toDate) continue;

    const dayStart = new Date(scheduledDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate); dayEnd.setHours(23, 59, 59, 999);

    const cmRows = await db.select({ id: clientMachinesTable.id }).from(clientMachinesTable).where(eq(clientMachinesTable.clientId, c.id));
    const cmIds = cmRows.map(r => r.id);
    let loadCount = 0;
    if (cmIds.length > 0) {
      const [row] = await db
        .select({ cnt: sql<string>`count(*)` })
        .from(machineLoadsTable)
        .where(and(inArray(machineLoadsTable.clientMachineId, cmIds), gte(machineLoadsTable.createdAt, dayStart), lte(machineLoadsTable.createdAt, dayEnd)));
      loadCount = parseInt(row?.cnt ?? "0");
    }

    result.push({
      clientId: c.id,
      clientName: c.name,
      dayOfWeek,
      scheduledDate: scheduledDate.toISOString().split("T")[0],
      executed: loadCount > 0,
      loadCount,
    });
  }

  res.json(result);
});

export default router;
