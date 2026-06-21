import { useState } from "react";
import { useListMachines, useCreateMachine, useUpdateMachine, useDeleteMachine, getListMachinesQueryKey } from "@workspace/api-client-react";
import { Machine } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Edit2, Trash2, Container, Coffee, FileDown, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { exportCsv, parseCsv, triggerFileInput } from "@/lib/csv";

const machineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["coffee", "vending"]),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  containerCount: z.coerce.number().optional().nullable(),
  rowCount: z.coerce.number().optional().nullable(),
  chuteCount: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export default function Machines() {
  const { data: machines, isLoading } = useListMachines();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const createMutation = useCreateMachine();
  const updateMutation = useUpdateMachine();
  const deleteMutation = useDeleteMachine();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin;

  const form = useForm<z.infer<typeof machineSchema>>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      name: "",
      type: "coffee",
      brand: "",
      model: "",
      containerCount: null,
      rowCount: null,
      chuteCount: null,
      notes: "",
    },
  });

  const machineType = form.watch("type");

  const handleOpenCreate = () => {
    form.reset({
      name: "",
      type: "coffee",
      brand: "",
      model: "",
      containerCount: null,
      rowCount: null,
      chuteCount: null,
      notes: "",
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (machine: Machine) => {
    setEditMachine(machine);
    form.reset({
      name: machine.name,
      type: machine.type as "coffee" | "vending",
      brand: machine.brand || "",
      model: machine.model || "",
      containerCount: machine.containerCount,
      rowCount: machine.rowCount,
      chuteCount: machine.chuteCount,
      notes: machine.notes || "",
    });
  };

  const onSubmit = (values: z.infer<typeof machineSchema>) => {
    // Clean up irrelevant fields based on type
    if (values.type === "coffee") {
      values.rowCount = null;
      values.chuteCount = null;
    } else {
      values.containerCount = null;
    }

    if (editMachine) {
      updateMutation.mutate({
        id: editMachine.id,
        data: values,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          setEditMachine(null);
          toast({ title: "Machine updated successfully" });
        }
      });
    } else {
      createMutation.mutate({
        data: values,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          setIsCreateOpen(false);
          toast({ title: "Machine created successfully" });
        }
      });
    }
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          setDeleteId(null);
          toast({ title: "Machine deleted successfully" });
        }
      });
    }
  };

  const handleExport = () => {
    if (!machines || machines.length === 0) {
      toast({ title: "Nothing to export", description: "No machines to export." });
      return;
    }
    exportCsv(
      "machines.csv",
      ["name", "type", "brand", "model", "containerCount", "rowCount", "chuteCount", "notes"],
      machines.map((m) => [
        m.name,
        m.type,
        m.brand ?? "",
        m.model ?? "",
        m.containerCount ?? "",
        m.rowCount ?? "",
        m.chuteCount ?? "",
        m.notes ?? "",
      ])
    );
    toast({ title: "Export complete", description: `${machines.length} machines exported to machines.csv` });
  };

  const handleImport = () => {
    triggerFileInput(".csv", (text, filename) => {
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: "Import failed", description: "CSV file is empty or has no valid rows.", variant: "destructive" });
        return;
      }
      let created = 0;
      let failed = 0;
      const createNext = (index: number) => {
        if (index >= rows.length) {
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          toast({ title: "Import complete", description: `${created} created, ${failed} failed from ${filename}` });
          return;
        }
        const row = rows[index];
        if (!row.name) { failed++; createNext(index + 1); return; }
        const type = row.type === "coffee" ? "coffee" : "vending";
        createMutation.mutate({
          data: {
            name: row.name,
            type,
            brand: row.brand || null,
            model: row.model || null,
            containerCount: row.containerCount ? parseInt(row.containerCount) : null,
            rowCount: row.rowCount ? parseInt(row.rowCount) : null,
            chuteCount: row.chuteCount ? parseInt(row.chuteCount) : null,
            notes: row.notes || null,
          }
        }, {
          onSuccess: () => { created++; createNext(index + 1); },
          onError: () => { failed++; createNext(index + 1); },
        });
      };
      createNext(0);
    });
  };

  const filteredMachines = machines?.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.brand?.toLowerCase().includes(search.toLowerCase()) ||
    m.model?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Machines</h1>
          <p className="text-muted-foreground">Manage machine types and specifications</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={handleImport}>
                <FileDown className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileUp className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Machine Definition
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search machines..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Brand & Model</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Loading machines...</TableCell>
              </TableRow>
            ) : filteredMachines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No machines found</TableCell>
              </TableRow>
            ) : (
              filteredMachines.map((machine) => (
                <TableRow key={machine.id}>
                  <TableCell>
                    {machine.type === 'coffee' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#7C4A3A]/10 text-[#7C4A3A]">
                          <Coffee className="w-4 h-4" />
                        </div>
                        <span className="capitalize">{machine.type}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-600">
                          <Container className="w-4 h-4" />
                        </div>
                        <span className="capitalize">{machine.type}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{machine.name}</TableCell>
                  <TableCell>
                    {machine.brand} {machine.model}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {machine.type === 'coffee' && machine.containerCount && `Containers: ${machine.containerCount}`}
                      {machine.type === 'vending' && (
                        <span>
                          {machine.rowCount && `Rows: ${machine.rowCount}`}
                          {machine.rowCount && machine.chuteCount && ', '}
                          {machine.chuteCount && `Chutes: ${machine.chuteCount}`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(machine)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(machine.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateOpen || !!editMachine} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditMachine(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMachine ? "Edit Machine" : "Create Machine"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine Name (Internal Reference)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!editMachine}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="coffee">Coffee Machine</SelectItem>
                        <SelectItem value="vending">Snack/Vending Machine</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {machineType === "coffee" ? (
                <FormField
                  control={form.control}
                  name="containerCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Container Count</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rowCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Row Count</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="chuteCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chutes Per Row</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditMachine(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editMachine ? "Update Machine" : "Create Machine"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Machine</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this machine definition? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
