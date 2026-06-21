import { useState, useMemo } from "react";
import { useListLogs, useListOperators } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { X } from "lucide-react";

const ACTION_OPTIONS = [
  { value: "create", label: "Създаване" },
  { value: "update", label: "Редакция" },
  { value: "delete", label: "Изтриване" },
  { value: "stock_in", label: "Склад вход" },
  { value: "stock_out", label: "Склад изход" },
  { value: "machine_load", label: "Зареждане" },
  { value: "assign", label: "Назначаване" },
  { value: "unassign", label: "Премахване" },
];

const ENTITY_OPTIONS = [
  { value: "client", label: "Клиент" },
  { value: "machine", label: "Машина" },
  { value: "product", label: "Продукт" },
  { value: "stock", label: "Склад" },
  { value: "schedule", label: "График" },
  { value: "operator", label: "Оператор" },
];

const ACTION_STYLES: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-rose-100 text-rose-800",
  stock_in: "bg-teal-100 text-teal-800",
  stock_out: "bg-orange-100 text-orange-800",
  machine_load: "bg-purple-100 text-purple-800",
  assign: "bg-sky-100 text-sky-800",
  unassign: "bg-amber-100 text-amber-800",
};

const ACTION_LABELS: Record<string, string> = {
  create: "СЪЗДАДЕ",
  update: "РЕДАКЦИЯ",
  delete: "ИЗТРИ",
  stock_in: "СКЛАД +",
  stock_out: "СКЛАД −",
  machine_load: "ЗАРЕДИ",
  assign: "НАЗНАЧИ",
  unassign: "ПРЕМАХНА",
};

const ENTITY_LABELS: Record<string, string> = {
  client: "Клиент",
  machine: "Машина",
  product: "Продукт",
  stock: "Склад",
  schedule: "График",
  operator: "Оператор",
};

const ALL_VALUE = "__all__";

export default function Logs() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionFilter, setActionFilter] = useState(ALL_VALUE);
  const [entityFilter, setEntityFilter] = useState(ALL_VALUE);
  const [operatorFilter, setOperatorFilter] = useState(ALL_VALUE);
  const [detailsSearch, setDetailsSearch] = useState("");

  const { data: operators } = useListOperators();

  const params = useMemo(() => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    action: actionFilter !== ALL_VALUE ? actionFilter : undefined,
    entity: entityFilter !== ALL_VALUE ? entityFilter : undefined,
    operatorId: operatorFilter !== ALL_VALUE ? Number(operatorFilter) : undefined,
  }), [dateFrom, dateTo, actionFilter, entityFilter, operatorFilter]);

  const { data: logs, isLoading } = useListLogs(params, {
    query: { queryKey: ["logs", params] },
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!detailsSearch.trim()) return logs;
    const q = detailsSearch.toLowerCase();
    return logs.filter(l =>
      l.details?.toLowerCase().includes(q) ||
      l.operatorName?.toLowerCase().includes(q)
    );
  }, [logs, detailsSearch]);

  const hasActiveFilters = dateFrom || dateTo || actionFilter !== ALL_VALUE || entityFilter !== ALL_VALUE || operatorFilter !== ALL_VALUE || detailsSearch;

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setActionFilter(ALL_VALUE);
    setEntityFilter(ALL_VALUE);
    setOperatorFilter(ALL_VALUE);
    setDetailsSearch("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Системен журнал</h1>
          <p className="text-muted-foreground">Одитна следа на всички административни действия</p>
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            <X className="w-3.5 h-3.5" />
            Изчисти филтрите
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-muted/30 p-4 rounded-lg border">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">От дата</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">До дата</label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Действие</label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Всички" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Всички</SelectItem>
              {ACTION_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Обект</label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Всички" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Всички</SelectItem>
              {ENTITY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Оператор</label>
          <Select value={operatorFilter} onValueChange={setOperatorFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Всички" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Всички</SelectItem>
              {(operators ?? []).map(op => (
                <SelectItem key={op.id} value={String(op.id)}>{op.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Детайли</label>
          <Input
            value={detailsSearch}
            onChange={e => setDetailsSearch(e.target.value)}
            placeholder="Търси..."
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground px-1">
        {isLoading ? "Зареждане..." : `${filteredLogs.length} записа`}
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[175px]">Дата и час</TableHead>
              <TableHead className="w-[140px]">Оператор</TableHead>
              <TableHead className="w-[110px]">Действие</TableHead>
              <TableHead className="w-[130px]">Обект</TableHead>
              <TableHead>Детайли</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Зареждане...</TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Няма намерени записи</TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground font-mono text-xs">
                    {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{log.operatorName}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${ACTION_STYLES[log.action] ?? "bg-secondary text-secondary-foreground"}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="capitalize">{ENTITY_LABELS[log.entity] ?? log.entity}</span>
                    {log.entityId ? <span className="text-muted-foreground ml-1 font-mono text-xs">#{log.entityId}</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-[400px] truncate" title={log.details ?? ""}>
                    {log.details ?? "—"}
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
