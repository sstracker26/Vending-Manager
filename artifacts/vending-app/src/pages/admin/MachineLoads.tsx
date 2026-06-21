import { useState, useMemo } from "react";
import { useListMachineLoads, useListClients, useListOperators } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { X, ShieldAlert, Coffee } from "lucide-react";

const ALL_VALUE = "__all__";

export default function MachineLoads() {
  const [clientFilter, setClientFilter] = useState(ALL_VALUE);
  const [operatorFilter, setOperatorFilter] = useState(ALL_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL_VALUE);

  const { data: clients } = useListClients();
  const { data: operators } = useListOperators();

  const params = useMemo(() => ({
    clientId: clientFilter !== ALL_VALUE ? Number(clientFilter) : undefined,
    operatorId: operatorFilter !== ALL_VALUE ? Number(operatorFilter) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [clientFilter, operatorFilter, dateFrom, dateTo]);

  const { data: loads, isLoading } = useListMachineLoads(params, {
    query: { queryKey: ["machine-loads", params] },
  });

  const filtered = useMemo(() => {
    if (!loads) return [];
    if (typeFilter === "initial") return loads.filter(l => l.isInitial);
    if (typeFilter === "regular") return loads.filter(l => !l.isInitial);
    return loads;
  }, [loads, typeFilter]);

  const hasFilters = clientFilter !== ALL_VALUE || operatorFilter !== ALL_VALUE || dateFrom || dateTo || typeFilter !== ALL_VALUE;

  function clearFilters() {
    setClientFilter(ALL_VALUE);
    setOperatorFilter(ALL_VALUE);
    setDateFrom("");
    setDateTo("");
    setTypeFilter(ALL_VALUE);
  }

  const totalRevenue = filtered.filter(l => !l.isInitial).reduce((s, l) => s + l.totalRevenue, 0);
  const totalCost = filtered.reduce((s, l) => s + l.totalCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">История на зарежданията</h1>
          <p className="text-muted-foreground">Всички записи за зареждане на машини</p>
        </div>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            <X className="w-3.5 h-3.5" />
            Изчисти филтрите
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-muted/30 p-4 rounded-lg border">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">От дата</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">До дата</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Клиент</label>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Всички" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Всички клиенти</SelectItem>
              {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Оператор</label>
          <Select value={operatorFilter} onValueChange={setOperatorFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Всички" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Всички оператори</SelectItem>
              {operators?.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Тип</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Всички" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Всички</SelectItem>
              <SelectItem value="regular">Редовно</SelectItem>
              <SelectItem value="initial">Начално</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Записи</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filtered.filter(l => l.isInitial).length} начални
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Приход (без начални)</p>
          <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} лв.</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Себестойност</p>
          <p className="text-2xl font-bold">{totalCost.toFixed(2)} лв.</p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground px-1">
        {isLoading ? "Зареждане..." : `${filtered.length} записа`}
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[155px]">Дата</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead className="w-[100px]">Машина</TableHead>
              <TableHead className="w-[130px]">Оператор</TableHead>
              <TableHead>Продукти</TableHead>
              <TableHead className="w-[110px] text-right">Стойност</TableHead>
              <TableHead className="w-[110px] text-center">Тип</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Зареждане...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Няма намерени записи</TableCell>
              </TableRow>
            ) : (
              filtered.map(load => (
                <TableRow key={load.id} className={load.isInitial ? "bg-amber-50/50" : ""}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {format(new Date(load.createdAt), "dd.MM.yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{load.clientName}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">#{load.machineNumber}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{load.operatorName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {load.items.map((item, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                          <Coffee className="w-3 h-3 text-muted-foreground" />
                          {item.productName}
                          <span className="text-muted-foreground">×{item.quantity}</span>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {load.isInitial ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span>{load.totalRevenue.toFixed(2)} лв.</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {load.isInitial ? (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 gap-1 text-xs">
                        <ShieldAlert className="w-3 h-3" />
                        Начално
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50">
                        Редовно
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
