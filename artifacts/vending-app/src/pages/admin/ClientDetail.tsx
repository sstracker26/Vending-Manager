import { useState } from "react";
import { Link, useParams } from "wouter";
import { useGetClient, useListClientMachines, useAssignMachineToClient, useRemoveClientMachine, useListMachines, getListClientMachinesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ArrowLeft, Coffee, MapPin, Phone, FileText, Plus, Trash2, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth";

const assignMachineSchema = z.object({
  machineId: z.coerce.number().min(1, "Machine is required"),
  machineNumber: z.string().min(1, "Machine Number is required"),
  installedAt: z.string().optional().nullable(),
});

export default function ClientDetail() {
  const params = useParams();
  const clientId = Number(params.id);
  const { isAdmin } = useAuth();
  const canEdit = isAdmin;
  
  const { data: client, isLoading: clientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId }
  });
  
  const { data: clientMachines, isLoading: machinesLoading } = useListClientMachines(clientId, {
    query: { enabled: !!clientId }
  });
  
  const { data: availableMachines } = useListMachines();

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const assignMutation = useAssignMachineToClient();
  const removeMutation = useRemoveClientMachine();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof assignMachineSchema>>({
    resolver: zodResolver(assignMachineSchema),
    defaultValues: {
      machineId: 0,
      machineNumber: "",
      installedAt: new Date().toISOString().split('T')[0],
    },
  });

  const handleOpenAssign = () => {
    form.reset({
      machineId: 0,
      machineNumber: "",
      installedAt: new Date().toISOString().split('T')[0],
    });
    setIsAssignOpen(true);
  };

  const onSubmitAssign = (values: z.infer<typeof assignMachineSchema>) => {
    assignMutation.mutate({
      clientId,
      data: values,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientMachinesQueryKey(clientId) });
        setIsAssignOpen(false);
        toast({ title: "Machine assigned successfully" });
      }
    });
  };

  const confirmRemove = () => {
    if (removeId) {
      removeMutation.mutate({ clientId, id: removeId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientMachinesQueryKey(clientId) });
          setRemoveId(null);
          toast({ title: "Machine removed successfully" });
        }
      });
    }
  };

  if (clientLoading) return <div className="p-8">Loading client details...</div>;
  if (!client) return <div className="p-8">Client not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/clients"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{client.name}</h1>
          <p className="text-muted-foreground">Client Details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-1">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{client.address || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{client.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Contract Status</p>
                <p className="text-sm text-muted-foreground">
                  {client.hasContract 
                    ? `Active (Started: ${client.contractStartDate ? format(new Date(client.contractStartDate), 'dd.MM.yyyy') : 'Unknown'})` 
                    : "No active contract"}
                </p>
              </div>
            </div>
            {client.notes && (
              <div className="pt-4 border-t border-border mt-4">
                <p className="text-sm font-medium">Notes</p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Assigned Machines</CardTitle>
              <CardDescription>Machines installed at this location</CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" onClick={handleOpenAssign}>
                <Plus className="w-4 h-4 mr-2" />
                Assign Machine
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {machinesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading machines...</div>
            ) : clientMachines && clientMachines.length > 0 ? (
              <div className="space-y-4">
                {clientMachines.map((machine) => (
                  <div key={machine.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${machine.machineType === 'coffee' ? 'bg-[#7C4A3A]/20 text-[#7C4A3A]' : 'bg-blue-500/20 text-blue-600'}`}>
                        <Coffee className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{machine.machineName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="bg-secondary px-2 py-0.5 rounded text-secondary-foreground">#{machine.machineNumber}</span>
                          <span>•</span>
                          <span className="capitalize">{machine.machineType}</span>
                          {machine.installedAt && (
                            <>
                              <span>•</span>
                              <span>Installed: {format(new Date(machine.installedAt), 'dd.MM.yyyy')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {machine.qrCode && (
                        <Button variant="ghost" size="icon" onClick={() => setQrCodeData(machine.qrCode!)}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setRemoveId(machine.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
                <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                <h3 className="font-medium text-lg text-foreground">No machines assigned</h3>
                <p className="text-muted-foreground text-sm mt-1">Assign a machine to this location to start tracking loads.</p>
                {canEdit && (
                  <Button className="mt-4" onClick={handleOpenAssign} variant="outline">
                    Assign Machine
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!qrCodeData} onOpenChange={(open) => { if (!open) setQrCodeData(null); }}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-center">Machine QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8 bg-white rounded-md">
            {qrCodeData && (
              <QRCodeSVG value={qrCodeData} size={256} level="H" includeMargin={true} />
            )}
          </div>
          <p className="text-sm text-muted-foreground break-all">{qrCodeData}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Machine to Client</DialogTitle>
            <DialogDescription>Install a registered machine at this location.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAssign)} className="space-y-4">
              <FormField
                control={form.control}
                name="machineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine Model</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select machine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableMachines?.map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name} ({m.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="machineNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory / Serial Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. VEND-1234" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="installedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Installation Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={assignMutation.isPending}>
                  Assign Machine
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeId} onOpenChange={(open) => { if (!open) setRemoveId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Machine</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this machine from the location? The history will be preserved but it won't be active here anymore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={removeMutation.isPending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
