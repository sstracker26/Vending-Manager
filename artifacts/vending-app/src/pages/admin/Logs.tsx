import { useState } from "react";
import { useListLogs } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function Logs() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const { data: logs, isLoading } = useListLogs({
    query: {
      queryKey: ["logs", dateFrom, dateTo],
    },
    request: {
      query: { 
        dateFrom: dateFrom || undefined, 
        dateTo: dateTo || undefined 
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">System Logs</h1>
          <p className="text-muted-foreground">Audit trail of administrative actions</p>
        </div>
      </div>

      <div className="flex gap-4 bg-muted/30 p-4 rounded-lg border max-w-md">
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

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Operator</TableHead>
              <TableHead className="w-[120px]">Action</TableHead>
              <TableHead className="w-[150px]">Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Loading logs...</TableCell>
              </TableRow>
            ) : !logs || logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No audit logs found for this period</TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground font-mono text-xs">
                    {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-medium">{log.operatorName}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider
                      ${log.action === 'create' ? 'bg-emerald-100 text-emerald-800' : 
                        log.action === 'update' ? 'bg-blue-100 text-blue-800' : 
                        log.action === 'delete' ? 'bg-rose-100 text-rose-800' : 
                        'bg-secondary text-secondary-foreground'}`}>
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">{log.entity} {log.entityId ? `#${log.entityId}` : ''}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs max-w-[300px] truncate" title={log.details || ""}>
                    {log.details || "-"}
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
