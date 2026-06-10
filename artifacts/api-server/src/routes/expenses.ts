import { Router, type IRouter } from "express";
import { db, expensesTable, clientsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  CreateExpenseBody,
  UpdateExpenseBody,
  UpdateExpenseParams,
  DeleteExpenseParams,
  ListExpensesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toResponse(e: typeof expensesTable.$inferSelect, clientName?: string | null) {
  return {
    id: e.id,
    clientId: e.clientId ?? null,
    clientName: clientName ?? null,
    category: e.category,
    amount: parseFloat(e.amount),
    description: e.description ?? null,
    isRecurring: e.isRecurring,
    date: e.date,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/expenses", async (req, res): Promise<void> => {
  const qp = ListExpensesQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const { clientId, dateFrom, dateTo } = qp.data;

  const conditions = [];
  if (clientId != null) conditions.push(eq(expensesTable.clientId, clientId));
  if (dateFrom) conditions.push(gte(expensesTable.date, dateFrom));
  if (dateTo) conditions.push(lte(expensesTable.date, dateTo));

  const rows = await db
    .select({ e: expensesTable, c: clientsTable })
    .from(expensesTable)
    .leftJoin(clientsTable, eq(expensesTable.clientId, clientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(expensesTable.date);

  res.json(rows.map(r => toResponse(r.e, r.c?.name)));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [expense] = await db.insert(expensesTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
    clientId: parsed.data.clientId ?? null,
  }).returning();
  let clientName: string | null = null;
  if (expense.clientId) {
    const [c] = await db.select().from(clientsTable).where(eq(clientsTable.id, expense.clientId));
    clientName = c?.name ?? null;
  }
  res.status(201).json(toResponse(expense, clientName));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = {};
  if (parsed.data.category != null) data.category = parsed.data.category;
  if (parsed.data.amount != null) data.amount = String(parsed.data.amount);
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.isRecurring != null) data.isRecurring = parsed.data.isRecurring;
  if (parsed.data.date != null) data.date = parsed.data.date;
  const [expense] = await db.update(expensesTable).set(data).where(eq(expensesTable.id, params.data.id)).returning();
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  let clientName: string | null = null;
  if (expense.clientId) {
    const [c] = await db.select().from(clientsTable).where(eq(clientsTable.id, expense.clientId));
    clientName = c?.name ?? null;
  }
  res.json(toResponse(expense, clientName));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [e] = await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id)).returning();
  if (!e) { res.status(404).json({ error: "Expense not found" }); return; }
  res.sendStatus(204);
});

export default router;
