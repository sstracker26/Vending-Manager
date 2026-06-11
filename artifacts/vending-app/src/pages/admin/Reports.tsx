import { useState } from "react";
import { useGetSalesReport, useListClients, useListMachines, useListProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Search } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState<number | null>(null);
  const [filterMachineId, setFilterMachineId] = useState<number | null>(null);
  const [filterProductId, setFilterProductId] = useState<number | null>(null);
  
  const { data: report, isLoading } = useGetSalesReport({
    query: {
      queryKey: ["sales-report", filterClientId, filterMachineId, filterProductId, dateFrom, dateTo],
    },
    request: {
      query: { 
        clientId: filterClientId || undefined,
        clientMachineId: filterMachineId || undefined,
        productId: filterProductId || undefined,
        dateFrom: dateFrom || undefined, 
        dateTo: dateTo || undefined 
      }
    }
  });
  
  const { data: clients } = useListClients();
  const { data: machines } = useListMachines();
  const { data: products } = useListProducts();
  const { toast } = useToast();

  const handleExport = () => {
    toast({ title: "Export Started", description: "Your Excel report is being generated and will download shortly." });
  };

  const formatEUR = (value: number) => {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Report</h1>
          <p className="text-muted-foreground">Detailed view of loads and profitability</p>
        </div>
        <Button onClick={handleExport}>
          <FileDown className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-muted/30 p-4 rounded-lg border">
        <Select onValueChange={(v) => setFilterClientId(v === "all" ? null : parseInt(v))} value={filterClientId ? filterClientId.toString() : "all"}>
          <SelectTrigger>
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients?.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => setFilterMachineId(v === "all" ? null : parseInt(v))} value={filterMachineId ? filterMachineId.toString() : "all"}>
          <SelectTrigger>
            <SelectValue placeholder="All Machines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Machine Types</SelectItem>
            {machines?.map(m => (
              <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => setFilterProductId(v === "all" ? null : parseInt(v))} value={filterProductId ? filterProductId.toString() : "all"}>
          <SelectTrigger>
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products?.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input 
          type="date" 
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          placeholder="From Date"
        />
        <Input 
          type="date" 
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          placeholder="To Date"
        />
      </div>

      {report && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Revenue</p>
            <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{formatEUR(report.totalRevenue)}</p>
          </div>
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase font-semibold">COGS (Cost of goods)</p>
            <p className="text-xl font-bold mt-1">{formatEUR(report.totalCost)}</p>
          </div>
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Gross Profit</p>
            <p className="text-xl font-bold mt-1">{formatEUR(report.totalProfit)}</p>
          </div>
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Expenses in period</p>
            <p className="text-xl font-bold mt-1 text-destructive">{formatEUR(report.totalExpenses)}</p>
          </div>
          <div className="bg-card border rounded-lg p-4 shadow-sm border-primary/50 bg-primary/5">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Net Profit</p>
            <p className={`text-xl font-bold mt-1 ${report.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {formatEUR(report.netProfit)}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Loading report data...</TableCell>
                </TableRow>
              ) : !report?.rows || report.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No data found for selected filters</TableCell>
                </TableRow>
              ) : (
                report.rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(row.date), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[150px]" title={row.clientName}>{row.clientName}</TableCell>
                    <TableCell className="truncate max-w-[150px]">
                      <span title={row.machineName}>{row.machineName}</span>
                      <span className="text-xs text-muted-foreground ml-1">#{row.machineNumber}</span>
                    </TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell className="text-right font-medium">{row.quantity}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{formatEUR(row.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatEUR(row.cost)}</TableCell>
                    <TableCell className="text-right font-medium">{formatEUR(row.profit)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
