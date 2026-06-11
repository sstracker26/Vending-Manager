import { useState } from "react";
import { useListStock, useListStockMovements, useCreateStockMovement, useListProducts, getListStockQueryKey, getListStockMovementsQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

const stockMovementSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  type: z.enum(["in", "out"]),
  reason: z.enum(["purchase", "load", "official_entry", "official_exit", "expired", "defect", "other"]),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  notes: z.string().optional().nullable(),
});

export default function Stock() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterProductId, setFilterProductId] = useState<number | null>(null);
  
  const { data: stockLevels, isLoading: stockLoading } = useListStock();
  const { data: movements, isLoading: movementsLoading } = useListStockMovements({
    query: {
      queryKey: ["stock-movements", filterProductId, dateFrom, dateTo],
    },
    request: {
      query: {
        productId: filterProductId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      }
    }
  });
  const { data: products } = useListProducts();
  
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const queryClient = useQueryClient();
  const createMutation = useCreateStockMovement();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin;

  const form = useForm<z.infer<typeof stockMovementSchema>>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      productId: 0,
      type: "in",
      reason: "purchase",
      quantity: 1,
      notes: "",
    },
  });

  const handleOpenMove = (type: "in" | "out") => {
    form.reset({
      productId: 0,
      type,
      reason: type === "in" ? "purchase" : "official_exit",
      quantity: 1,
      notes: "",
    });
    setIsMoveOpen(true);
  };

  const onSubmit = (values: z.infer<typeof stockMovementSchema>) => {
    createMutation.mutate({
      data: values,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
        setIsMoveOpen(false);
        toast({ title: "Stock movement recorded successfully" });
      }
    });
  };

  const formatEUR = (value: number) => {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  };

  const filteredStock = stockLevels?.filter(s => 
    s.productName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Stock Management</h1>
          <p className="text-muted-foreground">Track inventory levels and warehouse movements</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => handleOpenMove("out")}>
                <ArrowUpFromLine className="w-4 h-4 mr-2" />
                Stock Out
              </Button>
              <Button onClick={() => handleOpenMove("in")}>
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Stock In
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Current Stock</TabsTrigger>
          <TabsTrigger value="movements">Movement History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
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
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Unit Value</TableHead>
                  <TableHead className="text-right">Quantity in Stock</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Loading stock levels...</TableCell>
                  </TableRow>
                ) : filteredStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No stock data available</TableCell>
                  </TableRow>
                ) : (
                  filteredStock.map((item) => {
                    const matchedProduct = products?.find(p => p.id === item.productId);
                    const msq = matchedProduct?.minStockQuantity ?? 0;
                    const isLow = msq > 0 && item.quantity < msq;
                    return (
                      <TableRow key={item.productId} className={isLow ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.productName}
                            {isLow && (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                Low stock
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{item.productType}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatEUR(item.purchasePrice)}</TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={isLow ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                            {item.quantity} {item.unit}
                          </span>
                          {msq > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">/ min {msq}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatEUR(item.quantity * item.purchasePrice)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="movements">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

          <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Destination</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Loading movements...</TableCell>
                  </TableRow>
                ) : !movements || movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No movements found</TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(movement.createdAt), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {movement.type === 'in' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <ArrowDownToLine className="w-3 h-3 mr-1" />
                            IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                            <ArrowUpFromLine className="w-3 h-3 mr-1" />
                            OUT
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{movement.productName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.type === 'in' ? '+' : '-'}{movement.quantity}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{movement.reason.replace('_', ' ')}</span>
                        {movement.notes && (
                          <span className="text-muted-foreground block text-xs truncate max-w-[150px]">{movement.notes}</span>
                        )}
                      </TableCell>
                      <TableCell>{movement.operatorName || 'System'}</TableCell>
                      <TableCell>{movement.clientMachineName || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.watch("type") === "in" ? "Stock In (Add Inventory)" : "Stock Out (Remove Inventory)"}
            </DialogTitle>
            <DialogDescription>
              Record a manual stock movement.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch("type") === "in" ? (
                            <>
                              <SelectItem value="purchase">Purchase (New Stock)</SelectItem>
                              <SelectItem value="official_entry">Official Entry / Correction</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="official_exit">Official Exit / Correction</SelectItem>
                              <SelectItem value="defect">Defective Product</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsMoveOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Record Movement
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
