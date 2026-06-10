import { Router, type IRouter } from "express";
import { db, machineLoadsTable, machineLoadItemsTable, clientMachinesTable, clientsTable, machinesTable, productsTable, expensesTable } from "@workspace/db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { GetDashboardStatsQueryParams, GetDashboardTopProductsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const qp = GetDashboardStatsQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const { clientId, dateFrom, dateTo } = qp.data;

  const allClients = await db.select().from(clientsTable);
  const allCMs = await db.select({ cm: clientMachinesTable, c: clientsTable })
    .from(clientMachinesTable)
    .innerJoin(clientsTable, eq(clientMachinesTable.clientId, clientsTable.id));

  const loadConditions = [];
  if (clientId != null) {
    const cms = allCMs.filter(r => r.c.id === clientId).map(r => r.cm.id);
    if (cms.length === 0) {
      res.json({ totalRevenue: 0, totalCost: 0, totalProfit: 0, totalExpenses: 0, netProfit: 0, totalClients: allClients.length, totalMachines: allCMs.length, totalLoads: 0, clientStats: [] });
      return;
    }
    loadConditions.push(inArray(machineLoadsTable.clientMachineId, cms));
  }
  if (dateFrom) loadConditions.push(gte(machineLoadsTable.createdAt, new Date(dateFrom)));
  if (dateTo) loadConditions.push(lte(machineLoadsTable.createdAt, new Date(dateTo + "T23:59:59Z")));

  const loads = await db.select().from(machineLoadsTable).where(loadConditions.length > 0 ? and(...loadConditions) : undefined);

  const items = loads.length > 0
    ? await db.select({ i: machineLoadItemsTable })
        .from(machineLoadItemsTable)
        .where(inArray(machineLoadItemsTable.machineLoadId, loads.map(l => l.id)))
    : [];

  const loadMap = new Map(loads.map(l => [l.id, l]));
  const cmToClient = new Map(allCMs.map(r => [r.cm.id, r.c.id]));

  const clientRevMap = new Map<number, { revenue: number; cost: number; loads: number }>();
  for (const { i } of items) {
    const load = loadMap.get(i.machineLoadId);
    if (!load) continue;
    const cId = cmToClient.get(load.clientMachineId) ?? 0;
    const entry = clientRevMap.get(cId) ?? { revenue: 0, cost: 0, loads: 0 };
    const qty = parseFloat(i.quantity);
    entry.revenue += qty * parseFloat(i.salePrice);
    entry.cost += qty * parseFloat(i.purchasePrice);
    clientRevMap.set(cId, entry);
  }
  for (const load of loads) {
    const cId = cmToClient.get(load.clientMachineId) ?? 0;
    const entry = clientRevMap.get(cId) ?? { revenue: 0, cost: 0, loads: 0 };
    entry.loads += 1;
    clientRevMap.set(cId, entry);
  }

  const expConditions = [];
  if (clientId != null) expConditions.push(eq(expensesTable.clientId, clientId));
  if (dateFrom) expConditions.push(gte(expensesTable.date, dateFrom));
  if (dateTo) expConditions.push(lte(expensesTable.date, dateTo));
  const exps = await db.select().from(expensesTable).where(expConditions.length > 0 ? and(...expConditions) : undefined);

  const expByClient = new Map<number, number>();
  for (const e of exps) {
    if (e.clientId) {
      expByClient.set(e.clientId, (expByClient.get(e.clientId) ?? 0) + parseFloat(e.amount));
    }
  }
  const totalGlobalExp = exps.filter(e => !e.clientId).reduce((s, e) => s + parseFloat(e.amount), 0);

  const clientsToShow = clientId != null ? allClients.filter(c => c.id === clientId) : allClients;
  const clientStats = clientsToShow.map(c => {
    const rev = clientRevMap.get(c.id) ?? { revenue: 0, cost: 0, loads: 0 };
    const expenses = expByClient.get(c.id) ?? 0;
    const machineCount = allCMs.filter(r => r.c.id === c.id).length;
    return {
      clientId: c.id,
      clientName: c.name,
      revenue: rev.revenue,
      cost: rev.cost,
      profit: rev.revenue - rev.cost,
      expenses,
      netProfit: (rev.revenue - rev.cost) - expenses,
      machineCount,
      loadCount: rev.loads,
    };
  });

  const totalRevenue = clientStats.reduce((s, c) => s + c.revenue, 0);
  const totalCost = clientStats.reduce((s, c) => s + c.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalExpenses = clientStats.reduce((s, c) => s + c.expenses, 0) + totalGlobalExp;

  res.json({
    totalRevenue,
    totalCost,
    totalProfit,
    totalExpenses,
    netProfit: totalProfit - totalExpenses,
    totalClients: allClients.length,
    totalMachines: allCMs.length,
    totalLoads: loads.length,
    clientStats,
  });
});

router.get("/dashboard/top-products", async (req, res): Promise<void> => {
  const qp = GetDashboardTopProductsQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const { dateFrom, dateTo } = qp.data;

  const loadConditions = [];
  if (dateFrom) loadConditions.push(gte(machineLoadsTable.createdAt, new Date(dateFrom)));
  if (dateTo) loadConditions.push(lte(machineLoadsTable.createdAt, new Date(dateTo + "T23:59:59Z")));

  const loads = await db.select().from(machineLoadsTable).where(loadConditions.length > 0 ? and(...loadConditions) : undefined);

  if (loads.length === 0) {
    res.json({ topSelling: [], bottomSelling: [] });
    return;
  }

  const items = await db
    .select({ i: machineLoadItemsTable, p: productsTable })
    .from(machineLoadItemsTable)
    .innerJoin(productsTable, eq(machineLoadItemsTable.productId, productsTable.id))
    .where(inArray(machineLoadItemsTable.machineLoadId, loads.map(l => l.id)));

  const statsMap = new Map<number, { productId: number; productName: string; totalQuantity: number; totalRevenue: number; totalProfit: number }>();
  for (const { i, p } of items) {
    const entry = statsMap.get(p.id) ?? { productId: p.id, productName: p.name, totalQuantity: 0, totalRevenue: 0, totalProfit: 0 };
    const qty = parseFloat(i.quantity);
    const sp = parseFloat(i.salePrice);
    const pp = parseFloat(i.purchasePrice);
    entry.totalQuantity += qty;
    entry.totalRevenue += qty * sp;
    entry.totalProfit += qty * (sp - pp);
    statsMap.set(p.id, entry);
  }

  const sorted = [...statsMap.values()].sort((a, b) => b.totalQuantity - a.totalQuantity);
  res.json({ topSelling: sorted.slice(0, 5), bottomSelling: [...sorted].reverse().slice(0, 5) });
});

export default router;
