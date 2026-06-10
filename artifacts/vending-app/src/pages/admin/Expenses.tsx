import { useState } from "react";
import { useListExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useListClients, getListExpensesQueryKey } from "@workspace/api-client-react";
import { Expense } from "@workspace/api-client-react/src/generated/api.schemas";
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
import { Plus, Edit2, Trash2, Receipt, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

const expenseSchema = z.object({
  clientId: z.coerce.number().optional().nullable(),
  category: z.enum(["electricity", "rent", "repairs", "salary", "other"]),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional().nullable(),
  isRecurring: z.boolean(),
  date: z.string().min(1, "Date is required"),
});

export default function Expenses() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState<number | null>(null);
  
  const { data: expenses, isLoading } = useListExpenses({
    query: {
      queryKey: ["expenses", filterClientId, dateFrom, dateTo],
    },
    request: {
      query: { 
        clientId: filterClientId || undefined,
        dateFrom: dateFrom || undefined, 
        dateTo: dateTo || undefined 
      }
    }
  });
  
  const { data: clients } = useListClients();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  
  const queryClient = useQueryClient();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin;

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      clientId: null,
      category: "other",
      amount: 0,
      description: "",
      isRecurring: false,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const handleOpenCreate = () => {
    form.reset({
      clientId: null,
      category: "other",
      amount: 0,
      description: "",
      isRecurring: false,
      date: new Date().toISOString().split('T')[0],
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditExpense(expense);
    form.reset({
      clientId: expense.clientId || null,
      category: expense.category as "electricity" | "rent" | "repairs" | "salary" | "other",
      amount: expense.amount,
      description: expense.description || "",
      isRecurring: expense.isRecurring,
      date: expense.date.split('T')[0],
    });
  };

  const onSubmit = (values: z.infer<typeof expenseSchema>) => {
    if (editExpense) {
      updateMutation.mutate({
        id: editExpense.id,
        data: values,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          setEditExpense(null);
          toast({ title: "Expense updated successfully" });
        }
      });
    } else {
      createMutation.mutate({
        data: values,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          setIsCreateOpen(false);
          toast({ title: "Expense recorded successfully" });
        }
      });
    }
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          setDeleteId(null);
          toast({ title: "Expense deleted successfully" });
        }
      });
    }
  };

  const formatBGN = (value: number) => {
    return new Intl.NumberFormat("bg-BG", { style: "currency", currency: "BGN" }).format(value);
  };

  const filteredExpenses = expenses?.filter(e => 
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.clientName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Expenses</h1>
          <p className="text-muted-foreground">Track costs by client and category</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg border">
        <Select onValueChange={(v) => setFilterClientId(v === "all" ? null : parseInt(v))} value={filterClientId ? filterClientId.toString() : "all"}>
          <SelectTrigger>
            <SelectValue placeholder="All Contexts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Global & All Clients</SelectItem>
            <SelectItem value="global">Global Only (No Client)</SelectItem>
            {clients?.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
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
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search descriptions..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Context / Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Loading expenses...</TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No expenses found for this period</TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {format(new Date(expense.date), 'dd.MM.yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="capitalize bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs font-medium">
                        {expense.category}
                      </span>
                      {expense.isRecurring && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Recurring</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {expense.clientName ? (
                      <span className="text-primary">{expense.clientName}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Global</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={expense.description || ""}>
                    {expense.description || "-"}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-bold">
                    {formatBGN(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(expense)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(expense.id)}>
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
        {!isLoading && filteredExpenses.length > 0 && (
          <div className="bg-muted/30 p-4 border-t flex justify-end items-center gap-4">
            <span className="text-muted-foreground">Total for view:</span>
            <span className="text-xl font-bold text-destructive">{formatBGN(totalAmount)}</span>
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen || !!editExpense} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditExpense(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editExpense ? "Edit Expense" : "Record Expense"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (BGN)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="electricity">Electricity</SelectItem>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="repairs">Repairs & Maintenance</SelectItem>
                          <SelectItem value="salary">Salary / Labor</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Client (Optional)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value ? field.value.toString() : "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Global (No specific client)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Global (No specific client)</SelectItem>
                          {clients?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Invoice #, details, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 pt-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer text-muted-foreground">Mark as recurring expense</FormLabel>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditExpense(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editExpense ? "Update Expense" : "Save Expense"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense record? This action will affect dashboard metrics.
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
