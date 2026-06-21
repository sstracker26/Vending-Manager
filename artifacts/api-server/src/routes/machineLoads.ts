import { Router, type IRouter } from "express";
import { db, machineLoadsTable, machineLoadItemsTable, clientMachinesTable, clientsTable, machinesTable, productsTable, operatorsTable, stockMovementsTable, changeLogsTable } from "@workspace/db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import {
  CreateMachineLoadBody,
  ListMachineLoadsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildLoadResponse(load: typeof machineLoadsTable.$inferSelect) {
  const items = await db
    .select({ i: machineLoadItemsTable, p: productsTable })
    .from(machineLoadItemsTable)
    .innerJoin(productsTable, eq(machineLoadItemsTable.productId, productsTable.id))
    .where(eq(machineLoadItemsTable.machineLoadId, load.id));

  const [cm] = await db
    .select({ cm: clientMachinesTable, c: clientsTable, m: machinesTable })
    .from(clientMachinesTable)
    .innerJoin(clientsTable, eq(clientMachinesTable.clientId, clientsTable.id))
    .innerJoin(machinesTable, eq(clientMachinesTable.machineId, machinesTable.id))
    .where(eq(clientMachinesTable.id, load.clientMachineId));

  const [op] = load.operatorId
    ? await db.select().from(operatorsTable).where(eq(operatorsTable.id, load.operatorId))
    : [null];

  const loadItems = items.map(i => ({
    productId: i.i.productId,
    productName: i.p.name,
    quantity: parseFloat(i.i.quantity),
    purchasePrice: parseFloat(i.i.purchasePrice),
    salePrice: parseFloat(i.i.salePrice),
  }));

  const totalRevenue = loadItems.reduce((s, i) => s + i.quantity * i.salePrice, 0);
  const totalCost = loadItems.reduce((s, i) => s + i.quantity * i.purchasePrice, 0);

  return {
    id: load.id,
    clientId: cm?.c.id ?? 0,
    clientName: cm?.c.name ?? "",
    clientMachineId: load.clientMachineId,
    machineNumber: cm?.cm.machineNumber ?? "",
    machineName: cm?.m.name ?? "",
    operatorId: load.operatorId ?? null,
    operatorName: op?.name ?? null,
    isInitial: load.isInitial,
    items: loadItems,
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
    createdAt: load.createdAt.toISOString(),
  };
}

router.get("/machine-loads", async (req, res): Promise<void> => {
  const qp = ListMachineLoadsQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const { clientId, clientMachineId, operatorId, dateFrom, dateTo } = qp.data;

  let cmIds: number[] | null = null;
  if (clientId != null) {
    const cms = await db.select({ id: clientMachinesTable.id }).from(clientMachinesTable).where(eq(clientMachinesTable.clientId, clientId));
    cmIds = cms.map(c => c.id);
    if (cmIds.length === 0) { res.json([]); return; }
  }

  const conditions = [];
  if (clientMachineId != null) conditions.push(eq(machineLoadsTable.clientMachineId, clientMachineId));
  else if (cmIds) conditions.push(inArray(machineLoadsTable.clientMachineId, cmIds));
  if (operatorId != null) conditions.push(eq(machineLoadsTable.operatorId, operatorId));
  if (dateFrom) conditions.push(gte(machineLoadsTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(machineLoadsTable.createdAt, new Date(dateTo + "T23:59:59Z")));

  const loads = await db
    .select()
    .from(machineLoadsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${machineLoadsTable.createdAt} DESC`);

  const result = await Promise.all(loads.map(buildLoadResponse));
  res.json(result);
});

router.post("/machine-loads", async (req, res): Promise<void> => {
  const parsed = CreateMachineLoadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [cm] = await db
    .select({ cm: clientMachinesTable })
    .from(clientMachinesTable)
    .where(eq(clientMachinesTable.id, parsed.data.clientMachineId));
  if (!cm) { res.status(404).json({ error: "Client machine not found" }); return; }

  const productIds = parsed.data.items.map(i => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map(p => [p.id, p]));

  const [load] = await db.insert(machineLoadsTable).values({
    clientMachineId: parsed.data.clientMachineId,
    operatorId: parsed.data.operatorId ?? null,
    isInitial: parsed.data.isInitial ?? false,
  }).returning();

  const itemRows = parsed.data.items.map(item => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    return {
      machineLoadId: load.id,
      productId: item.productId,
      quantity: String(item.quantity),
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
    };
  });

  await db.insert(machineLoadItemsTable).values(itemRows);

  for (const item of parsed.data.items) {
    await db.insert(stockMovementsTable).values({
      productId: item.productId,
      type: "out",
      reason: "load",
      quantity: String(item.quantity),
      clientMachineId: parsed.data.clientMachineId,
      notes: `Machine load #${load.id}`,
      operatorId: parsed.data.operatorId ?? null,
    });
  }

  const opId = parsed.data.operatorId ?? req.session?.operatorId ?? null;
  if (opId) {
    const itemsSummary = parsed.data.items.map(i => {
      const p = productMap.get(i.productId);
      return `${i.quantity}x ${p?.name ?? i.productId}`;
    }).join(", ");
    await db.insert(changeLogsTable).values({
      operatorId: opId,
      action: "machine_load",
      entity: "stock",
      entityId: load.id,
      details: `Machine load #${load.id} — machine ${cm.cm.machineNumber}: ${itemsSummary}`,
    });
  }

  const response = await buildLoadResponse(load);
  res.status(201).json(response);
});

export default router;
