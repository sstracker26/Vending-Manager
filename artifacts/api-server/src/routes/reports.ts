import { Router, type IRouter } from "express";
import { db, machineLoadsTable, machineLoadItemsTable, clientMachinesTable, clientsTable, machinesTable, productsTable, expensesTable } from "@workspace/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { GetSalesReportQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/sales", async (req, res): Promise<void> => {
  const qp = GetSalesReportQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const { clientId, clientMachineId, productId, dateFrom, dateTo } = qp.data;

  let cmIds: number[] | null = null;
  if (clientId != null) {
    const cms = await db.select({ id: clientMachinesTable.id }).from(clientMachinesTable).where(eq(clientMachinesTable.clientId, clientId));
    cmIds = cms.map(c => c.id);
    if (cmIds.length === 0) {
      res.json({ totalRevenue: 0, totalCost: 0, totalProfit: 0, totalExpenses: 0, netProfit: 0, rows: [] });
      return;
    }
  }

  const loadConditions = [];
  if (clientMachineId != null) loadConditions.push(eq(machineLoadsTable.clientMachineId, clientMachineId));
  else if (cmIds) loadConditions.push(inArray(machineLoadsTable.clientMachineId, cmIds));
  if (dateFrom) loadConditions.push(gte(machineLoadsTable.createdAt, new Date(dateFrom)));
  if (dateTo) loadConditions.push(lte(machineLoadsTable.createdAt, new Date(dateTo + "T23:59:59Z")));

  const loads = await db
    .select()
    .from(machineLoadsTable)
    .where(loadConditions.length > 0 ? and(...loadConditions) : undefined);

  if (loads.length === 0) {
    res.json({ totalRevenue: 0, totalCost: 0, totalProfit: 0, totalExpenses: 0, netProfit: 0, rows: [] });
    return;
  }

  const loadIds = loads.map(l => l.id);
  const itemConditions = [inArray(machineLoadItemsTable.machineLoadId, loadIds)];
  if (productId != null) itemConditions.push(eq(machineLoadItemsTable.productId, productId));

  const items = await db
    .select({ i: machineLoadItemsTable, p: productsTable })
    .from(machineLoadItemsTable)
    .innerJoin(productsTable, eq(machineLoadItemsTable.productId, productsTable.id))
    .where(and(...itemConditions));

  const loadMap = new Map(loads.map(l => [l.id, l]));
  const cmInfoMap = new Map<number, { clientId: number; clientName: string; machineNumber: string; machineName: string }>();
  const cmIds2 = [...new Set(loads.map(l => l.clientMachineId))];
  const cmRows = await db
    .select({ cm: clientMachinesTable, c: clientsTable, m: machinesTable })
    .from(clientMachinesTable)
    .innerJoin(clientsTable, eq(clientMachinesTable.clientId, clientsTable.id))
    .innerJoin(machinesTable, eq(clientMachinesTable.machineId, machinesTable.id))
    .where(inArray(clientMachinesTable.id, cmIds2));
  for (const r of cmRows) {
    cmInfoMap.set(r.cm.id, { clientId: r.c.id, clientName: r.c.name, machineNumber: r.cm.machineNumber, machineName: r.m.name });
  }

  const rows = items.map(({ i, p }) => {
    const load = loadMap.get(i.machineLoadId)!;
    const cm = cmInfoMap.get(load.clientMachineId) ?? { clientId: 0, clientName: "", machineNumber: "", machineName: "" };
    const qty = parseFloat(i.quantity);
    const pp = parseFloat(i.purchasePrice);
    const sp = parseFloat(i.salePrice);
    return {
      date: load.createdAt.toISOString().split("T")[0],
      clientId: cm.clientId,
      clientName: cm.clientName,
      clientMachineId: load.clientMachineId,
      machineNumber: cm.machineNumber,
      machineName: cm.machineName,
      productId: p.id,
      productName: p.name,
      quantity: qty,
      revenue: qty * sp,
      cost: qty * pp,
      profit: qty * (sp - pp),
    };
  });

  const expConditions = [];
  if (clientId != null) expConditions.push(eq(expensesTable.clientId, clientId));
  if (dateFrom) expConditions.push(gte(expensesTable.date, dateFrom));
  if (dateTo) expConditions.push(lte(expensesTable.date, dateTo));
  const exps = await db.select().from(expensesTable).where(expConditions.length > 0 ? and(...expConditions) : undefined);
  const totalExpenses = exps.reduce((s, e) => s + parseFloat(e.amount), 0);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);

  res.json({ totalRevenue, totalCost, totalProfit, totalExpenses, netProfit: totalProfit - totalExpenses, rows });
});

export default router;
