import { Router, type IRouter } from "express";
import { db, productsTable, stockMovementsTable, clientMachinesTable, operatorsTable, machinesTable, clientsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  CreateStockMovementBody,
  ListStockMovementsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stock", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.name);
  const result = await Promise.all(products.map(async p => {
    const [row] = await db
      .select({ qty: sql<string>`COALESCE(SUM(CASE WHEN type = 'in' THEN quantity::numeric ELSE -quantity::numeric END), 0)` })
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.productId, p.id));
    return {
      productId: p.id,
      productName: p.name,
      productType: p.type,
      unit: p.unit,
      quantity: parseFloat(row?.qty ?? "0"),
      purchasePrice: parseFloat(p.purchasePrice),
      salePrice: parseFloat(p.salePrice),
    };
  }));
  res.json(result);
});

router.get("/stock/alerts", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.name);
  const alerts = await Promise.all(products.map(async p => {
    const msq = parseFloat(p.minStockQuantity);
    if (msq <= 0) return null;
    const [row] = await db
      .select({ qty: sql<string>`COALESCE(SUM(CASE WHEN type = 'in' THEN quantity::numeric ELSE -quantity::numeric END), 0)` })
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.productId, p.id));
    const qty = parseFloat(row?.qty ?? "0");
    if (qty < msq) {
      return { productId: p.id, productName: p.name, unit: p.unit, stockQuantity: qty, minStockQuantity: msq };
    }
    return null;
  }));
  res.json(alerts.filter(Boolean));
});

router.get("/stock/movements", async (req, res): Promise<void> => {
  const qp = ListStockMovementsQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const { productId, dateFrom, dateTo } = qp.data;

  const conditions = [];
  if (productId != null) conditions.push(eq(stockMovementsTable.productId, productId));
  if (dateFrom) conditions.push(gte(stockMovementsTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(stockMovementsTable.createdAt, new Date(dateTo + "T23:59:59Z")));

  const rows = await db
    .select({
      sm: stockMovementsTable,
      p: productsTable,
      op: operatorsTable,
      cm: clientMachinesTable,
      m: machinesTable,
    })
    .from(stockMovementsTable)
    .innerJoin(productsTable, eq(stockMovementsTable.productId, productsTable.id))
    .leftJoin(operatorsTable, eq(stockMovementsTable.operatorId, operatorsTable.id))
    .leftJoin(clientMachinesTable, eq(stockMovementsTable.clientMachineId, clientMachinesTable.id))
    .leftJoin(machinesTable, eq(clientMachinesTable.machineId, machinesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${stockMovementsTable.createdAt} DESC`);

  res.json(rows.map(r => ({
    id: r.sm.id,
    productId: r.sm.productId,
    productName: r.p.name,
    type: r.sm.type,
    reason: r.sm.reason,
    quantity: parseFloat(r.sm.quantity),
    clientMachineId: r.sm.clientMachineId ?? null,
    clientMachineName: r.cm ? `${r.m?.name ?? "?"} #${r.cm.machineNumber}` : null,
    notes: r.sm.notes ?? null,
    operatorId: r.sm.operatorId ?? null,
    operatorName: r.op?.name ?? null,
    createdAt: r.sm.createdAt.toISOString(),
  })));
});

router.post("/stock/movements", async (req, res): Promise<void> => {
  const parsed = CreateStockMovementBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.productId));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const [sm] = await db.insert(stockMovementsTable).values({
    productId: parsed.data.productId,
    type: parsed.data.type,
    reason: parsed.data.reason,
    quantity: String(parsed.data.quantity),
    clientMachineId: parsed.data.clientMachineId ?? null,
    notes: parsed.data.notes ?? null,
    operatorId: parsed.data.operatorId ?? req.session?.operatorId ?? null,
  }).returning();

  res.status(201).json({
    id: sm.id,
    productId: sm.productId,
    productName: product.name,
    type: sm.type,
    reason: sm.reason,
    quantity: parseFloat(sm.quantity),
    clientMachineId: sm.clientMachineId ?? null,
    clientMachineName: null,
    notes: sm.notes ?? null,
    operatorId: sm.operatorId ?? null,
    operatorName: null,
    createdAt: sm.createdAt.toISOString(),
  });
});

export default router;
