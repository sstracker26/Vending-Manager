import { useState } from "react";
import { useGetDashboardStats, useGetDashboardTopProducts, useGetStockAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Banknote, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, Package, Users, Container, ShoppingCart, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: {
      queryKey: ["dashboard-stats", dateFrom, dateTo],
    },
    request: {
      query: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
    }
  });

  const { data: topProducts, isLoading: productsLoading } = useGetDashboardTopProducts({
    query: {
      queryKey: ["dashboard-top-products", dateFrom, dateTo],
    },
    request: {
      query: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
    }
  });

  const { data: stockAlerts } = useGetStockAlerts();

  const formatEUR = (value: number) => {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  };

  if (statsLoading || productsLoading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your vending machine network</p>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-muted-foreground">-</span>
          <input 
            type="date" 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {stockAlerts && stockAlerts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alerts ({stockAlerts.length})
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-500">
              The following products have fallen below their minimum stock quantity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stockAlerts.map(alert => {
                const pct = alert.minStockQuantity > 0
                  ? Math.min(100, Math.round((alert.stockQuantity / alert.minStockQuantity) * 100))
                  : 0;
                return (
                  <div key={alert.productId} className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{alert.productName}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-500">
                          {alert.stockQuantity} / {alert.minStockQuantity} {alert.unit} min
                        </p>
                      </div>
                    </div>
                    <div className="ml-3 shrink-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        pct === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      }`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-right">
              <Link href="/admin/stock" className="text-xs text-amber-700 dark:text-amber-500 underline hover:no-underline">
                Go to Stock Management →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <Banknote className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatEUR(stats.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                {stats.netProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {formatEUR(stats.netProfit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatEUR(stats.totalExpenses)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Loads</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLoads}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
                <Container className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMachines}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>By total revenue</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {topProducts && topProducts.topSelling.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.topSelling} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="productName" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatEUR(value)} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                        {topProducts.topSelling.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Bottom Selling Products</CardTitle>
                <CardDescription>By total revenue</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {topProducts && topProducts.bottomSelling.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.bottomSelling} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="productName" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatEUR(value)} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="totalRevenue" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]}>
                        {topProducts.bottomSelling.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="hsl(var(--destructive))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Client Performance</CardTitle>
              <CardDescription>Revenue and profit by client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-md">Client</th>
                      <th className="px-4 py-3 text-right">Machines</th>
                      <th className="px-4 py-3 text-right">Loads</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Expenses</th>
                      <th className="px-4 py-3 text-right rounded-tr-md">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.clientStats.map((client) => (
                      <tr key={client.clientId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{client.clientName}</td>
                        <td className="px-4 py-3 text-right">{client.machineCount}</td>
                        <td className="px-4 py-3 text-right">{client.loadCount}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatEUR(client.revenue)}</td>
                        <td className="px-4 py-3 text-right text-destructive">{formatEUR(client.expenses)}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatEUR(client.netProfit)}</td>
                      </tr>
                    ))}
                    {stats.clientStats.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No client data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
