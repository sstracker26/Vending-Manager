import { useState } from "react";
import { useListOperators, useCreateOperator, useUpdateOperator, useDeleteOperator, getListOperatorsQueryKey } from "@workspace/api-client-react";
import { Operator } from "@workspace/api-client-react/src/generated/api.schemas";
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
import { Plus, Edit2, Trash2, Shield, UserCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const operatorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["operator", "moderator", "admin"]),
  password: z.string().optional().nullable(),
  isActive: z.boolean(),
});

export default function Operators() {
  const { data: operators, isLoading } = useListOperators();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOperator, setEditOperator] = useState<Operator | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const createMutation = useCreateOperator();
  const updateMutation = useUpdateOperator();
  const deleteMutation = useDeleteOperator();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin;

  const form = useForm<z.infer<typeof operatorSchema>>({
    resolver: zodResolver(operatorSchema),
    defaultValues: {
      name: "",
      type: "operator",
      password: "",
      isActive: true,
    },
  });

  const type = form.watch("type");

  const handleOpenCreate = () => {
    form.reset({
      name: "",
      type: "operator",
      password: "",
      isActive: true,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (operator: Operator) => {
    setEditOperator(operator);
    form.reset({
      name: operator.name,
      type: operator.type as "operator" | "moderator" | "admin",
      password: "", // Don't pre-fill password on edit
      isActive: operator.isActive,
    });
  };

  const onSubmit = (values: z.infer<typeof operatorSchema>) => {
    // Clean up empty passwords on edit to not change them
    if (editOperator && !values.password) {
      delete values.password;
    }

    // Passwords only apply to admin and moderator types
    if (values.type === "operator") {
      values.password = null;
    }

    if (editOperator) {
      updateMutation.mutate({
        id: editOperator.id,
        data: values,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOperatorsQueryKey() });
          setEditOperator(null);
          toast({ title: "Operator updated successfully" });
        }
      });
    } else {
      createMutation.mutate({
        data: values,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOperatorsQueryKey() });
          setIsCreateOpen(false);
          toast({ title: "Operator created successfully" });
        }
      });
    }
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOperatorsQueryKey() });
          setDeleteId(null);
          toast({ title: "Operator deleted successfully" });
        }
      });
    }
  };

  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case "admin": return <Shield className="w-4 h-4 text-rose-500" />;
      case "moderator": return <Users className="w-4 h-4 text-blue-500" />;
      case "operator": return <UserCircle className="w-4 h-4 text-emerald-500" />;
      default: return <UserCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Personnel</h1>
          <p className="text-muted-foreground">Manage operators, moderators, and admins</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Personnel
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Loading personnel...</TableCell>
              </TableRow>
            ) : !operators || operators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No personnel found</TableCell>
              </TableRow>
            ) : (
              operators.map((operator) => (
                <TableRow key={operator.id}>
                  <TableCell className="font-medium">{operator.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(operator.type)}
                      <span className="capitalize">{operator.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {operator.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(operator)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(operator.id)}>
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

      <Dialog open={isCreateOpen || !!editOperator} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditOperator(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editOperator ? "Edit Personnel" : "Add Personnel"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
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
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="operator">Field Operator</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-center pt-8">
                      <div className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer mb-0">Active Account</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {(type === "admin" || type === "moderator") && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editOperator ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditOperator(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editOperator ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Personnel</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this person? Their history will be preserved but they won't be able to access the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
