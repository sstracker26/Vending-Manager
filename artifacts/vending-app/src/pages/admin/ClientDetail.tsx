import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { useGetClient, useListClientMachines, useAssignMachineToClient, useRemoveClientMachine, useListMachines, useGetNextMachineNumber, getListClientMachinesQueryKey } from "@workspace/api-client-react";
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
import { ArrowLeft, Coffee, MapPin, Phone, FileText, Plus, Trash2, QrCode, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth";

const assignMachineSchema = z.object({
  machineId: z.coerce.number().min(1, "Machine is required"),
  machineNumber: z.string().min(1, "Machine Number is required"),
  installedAt: z.string().optional().nullable(),
});

interface QrTarget {
  machineNumber: string;
  url: string;
}

export default function ClientDetail() {
  const params = useParams();
  const clientId = Number(params.id);
  const { isAdmin } = useAuth();
  const canEdit = isAdmin;
  
  const { data: client, isLoading: clientLoading } = useGetClient(clientId);
  const { data: clientMachines, isLoading: machinesLoading } = useListClientMachines(clientId);
  
  const { data: availableMachines } = useListMachines();
  const { data: nextNumberData } = useGetNextMachineNumber();

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
  const qrPrintRef = useRef<HTMLDivElement>(null);

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
      machineNumber: nextNumberData?.nextNumber ?? "",
      installedAt: new Date().toISOString().split('T')[0],
    });
    setIsAssignOpen(true);
  };

  const onSubmitAssign = (values: z.infer<typeof assignMachineSchema>) => {
    assignMutation.mutate({
      id: clientId,
      data: values,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientMachinesQueryKey(clientId) });
        setIsAssignOpen(false);
        toast({ title: "Machine assigned successfully" });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Assignment failed";
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    });
  };

  const confirmRemove = () => {
    if (removeId) {
      removeMutation.mutate({ clientId, machineId: removeId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientMachinesQueryKey(clientId) });
          setRemoveId(null);
          toast({ title: "Machine removed successfully" });
        }
      });
    }
  };

  const getQrUrl = (machineId: number) => {
    return `${window.location.origin}/?clientId=${clientId}&machineId=${machineId}`;
  };

  const handleShowQr = (machine: { id: number; machineNumber: string }) => {
    setQrTarget({ machineNumber: machine.machineNumber, url: getQrUrl(machine.id) });
  };

  const handlePrint = () => {
    if (!qrTarget) return;
    const printWindow = window.open("", "_blank", "width=400,height=500");
    if (!printWindow) return;
    const svgEl = qrPrintRef.current?.querySelector("svg");
    const svgHtml = svgEl ? svgEl.outerHTML : "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${qrTarget.machineNumber}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 32px; }
            h2 { font-size: 20px; margin-bottom: 8px; }
            p { font-size: 12px; color: #666; word-break: break-all; margin-top: 12px; }
            svg { width: 240px; height: 240px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2>${qrTarget.machineNumber}</h2>
          ${svgHtml}
          <p>${qrTarget.url}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                          <span className="bg-secondary px-2 py-0.5 rounded text-secondary-foreground font-mono">#{machine.machineNumber}</span>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Show QR code"
                        onClick={() => handleShowQr(machine)}
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
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
      <Dialog open={!!qrTarget} onOpenChange={(open) => { if (!open) setQrTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              QR Code — <span className="font-mono">#{qrTarget?.machineNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Scan to open the operator load form for this machine
            </DialogDescription>
          </DialogHeader>
          <div ref={qrPrintRef} className="flex justify-center py-6 bg-white rounded-md">
            {qrTarget && (
              <QRCodeSVG value={qrTarget.url} size={220} level="H" includeMargin={true} />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center break-all px-2">{qrTarget?.url}</p>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setQrTarget(null)}>Close</Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Machine Dialog */}
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
                    <FormLabel className="flex items-center gap-2">
                      Inventory Number
                      <span className="text-xs font-normal text-muted-foreground">— auto-generated, you can edit</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="VM-008" className="font-mono" />
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
                  {assignMutation.isPending ? "Assigning…" : "Assign Machine"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
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
