import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { Product } from "@workspace/api-client-react/src/generated/api.schemas";
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
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, FileDown, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { exportCsv, parseCsv, triggerFileInput } from "@/lib/csv";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["coffee", "vending"]),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  unit: z.string().min(1, "Unit is required"),
  minStockQuantity: z.coerce.number().min(0),
  notes: z.string().optional().nullable(),
});

export default function Products() {
  const { data: products, isLoading } = useListProducts();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin;

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      type: "vending",
      purchasePrice: 0,
      salePrice: 0,
      unit: "бр",
      minStockQuantity: 0,
      notes: "",
    },
  });

  const handleOpenCreate = () => {
    form.reset({
      name: "",
      type: "vending",
      purchasePrice: 0,
      salePrice: 0,
      unit: "бр",
      minStockQuantity: 0,
      notes: "",
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditProduct(product);
    form.reset({
      name: product.name,
      type: product.type as "coffee" | "vending",
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      unit: product.unit,
      minStockQuantity: product.minStockQuantity,
      notes: product.notes || "",
    });
  };

  const onSubmit = (values: z.infer<typeof productSchema>) => {
    if (editProduct) {
      updateMutation.mutate({
        id: editProduct.id,
        data: values,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setEditProduct(null);
          toast({ title: "Product updated successfully" });
        }
      });
    } else {
      createMutation.mutate({
        data: values,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setIsCreateOpen(false);
          toast({ title: "Product created successfully" });
        }
      });
    }
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setDeleteId(null);
          toast({ title: "Product deleted successfully" });
        }
      });
    }
  };

  const handleExport = () => {
    if (!products || products.length === 0) {
      toast({ title: "Nothing to export", description: "No products to export." });
      return;
    }
    exportCsv(
      "products.csv",
      ["name", "type", "purchasePrice", "salePrice", "unit", "minStockQuantity", "notes"],
      products.map((p) => [
        p.name,
        p.type,
        p.purchasePrice,
        p.salePrice,
        p.unit,
        p.minStockQuantity,
        p.notes ?? "",
      ])
    );
    toast({ title: "Export complete", description: `${products.length} products exported to products.csv` });
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
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
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
            purchasePrice: parseFloat(row.purchasePrice) || 0,
            salePrice: parseFloat(row.salePrice) || 0,
            unit: row.unit || "бр",
            minStockQuantity: parseInt(row.minStockQuantity) || 0,
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

  const formatEUR = (value: number) => {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage product catalog and pricing</p>
        </div>
        <div className="flex items-center gap-2">
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
                Add Product
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
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
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Purchase Price</TableHead>
              <TableHead className="text-right">Sale Price</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Loading products...</TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No products found</TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const margin = product.salePrice - product.purchasePrice;
                const marginPercent = product.purchasePrice > 0 ? (margin / product.purchasePrice) * 100 : 0;
                const isLowStock = product.minStockQuantity > 0 && product.stockQuantity < product.minStockQuantity;
                
                return (
                  <TableRow key={product.id} className={isLowStock ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {product.name}
                        {isLowStock && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" title="Low stock!" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{product.type}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatEUR(product.purchasePrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatEUR(product.salePrice)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs px-2 py-1 rounded ${margin > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
                        {formatEUR(margin)} ({marginPercent.toFixed(0)}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={isLowStock ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                        {product.stockQuantity} {product.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {product.minStockQuantity > 0 ? `${product.minStockQuantity} ${product.unit}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(product)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(product.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateOpen || !!editProduct} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditProduct(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Create Product"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="coffee">Coffee / Supplies</SelectItem>
                          <SelectItem value="vending">Snacks / Drinks</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="бр">Брой (бр)</SelectItem>
                          <SelectItem value="чаша">Чаша (чаша)</SelectItem>
                          <SelectItem value="кг">Килограми (кг)</SelectItem>
                          <SelectItem value="г">Грамове (г)</SelectItem>
                          <SelectItem value="л">Литри (л)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price (EUR)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price (EUR)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="minStockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Min Stock Quantity (MSQ)
                      <span className="text-xs font-normal text-muted-foreground">— alerts when stock falls below this</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditProduct(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editProduct ? "Update Product" : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
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
