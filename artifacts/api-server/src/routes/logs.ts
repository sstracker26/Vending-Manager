import { Router, type IRouter } from "express";
import { db, changeLogsTable, operatorsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, ilike } from "drizzle-orm";
import { ListLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/logs", async (req, res): Promise<void> => {
  const qp = ListLogsQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const { dateFrom, dateTo, action, entity, operatorId } = qp.data;

  const conditions = [];
  if (dateFrom) conditions.push(gte(changeLogsTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(changeLogsTable.createdAt, new Date(dateTo + "T23:59:59Z")));
  if (action) conditions.push(ilike(changeLogsTable.action, action));
  if (entity) conditions.push(ilike(changeLogsTable.entity, entity));
  if (operatorId) conditions.push(eq(changeLogsTable.operatorId, operatorId));

  const rows = await db
    .select({ l: changeLogsTable, o: operatorsTable })
    .from(changeLogsTable)
    .innerJoin(operatorsTable, eq(changeLogsTable.operatorId, operatorsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${changeLogsTable.createdAt} DESC`);

  res.json(rows.map(r => ({
    id: r.l.id,
    operatorId: r.l.operatorId,
    operatorName: r.o.name,
    action: r.l.action,
    entity: r.l.entity,
    entityId: r.l.entityId ?? null,
    details: r.l.details ?? null,
    createdAt: r.l.createdAt.toISOString(),
  })));
});

export default router;
