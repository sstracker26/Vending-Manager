import { useState, useEffect } from "react";
import { 
  useListClients, 
  useListClientMachines, 
  useListProducts, 
  useListOperators,
  useCreateMachineLoad
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin, Coffee, Users, Package, QrCode, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QrScannerDialog } from "@/components/QrScannerDialog";

interface LoadItem {
  productId: number;
  quantity: number;
}

export default function OperatorHome() {
  const [clientId, setClientId] = useState<number | null>(null);
  const [machineId, setMachineId] = useState<number | null>(null);
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const [items, setItems] = useState<LoadItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedBadge, setScannedBadge] = useState<string | null>(null);

  const { data: clients } = useListClients();
  const { data: machines } = useListClientMachines(clientId || 0, {
    query: { enabled: !!clientId }
  });
  const { data: allProducts } = useListProducts();
  const { data: operators } = useListOperators();

  const selectedMachine = machines?.find(m => m.id === machineId);
  const products = selectedMachine
    ? allProducts?.filter(p => p.type === selectedMachine.machineType)
    : allProducts;

  const createLoad = useCreateMachineLoad();
  const { toast } = useToast();

  // Handle QR code URL params on page load (when opened via QR code link directly)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrClientId = parseInt(params.get("clientId") ?? "");
    const qrMachineId = parseInt(params.get("machineId") ?? "");
    if (!isNaN(qrClientId) && !isNaN(qrMachineId)) {
      setClientId(qrClientId);
      setMachineId(qrMachineId);
      // Clean the URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Set badge label when client+machine are filled (from scan or URL)
  useEffect(() => {
    if (clientId && machines && machineId) {
      const cm = machines.find(m => m.id === machineId);
      const client = clients?.find(c => c.id === clientId);
      if (cm && client) {
        setScannedBadge(`${client.name} — ${cm.machineName} #${cm.machineNumber}`);
      }
    } else {
      setScannedBadge(null);
    }
  }, [clientId, machineId, machines, clients]);

  const handleClientChange = (val: string) => {
    setClientId(parseInt(val));
    setMachineId(null);
    setItems([]);
    setScannedBadge(null);
  };

  const handleQrScan = (scannedClientId: number, scannedMachineId: number) => {
    setClientId(scannedClientId);
    setMachineId(scannedMachineId);
    toast({
      title: "QR Code Scanned!",
      description: "Machine location auto-filled. Select your name and add items.",
    });
  };

  const addItem = () => {
    setItems([...items, { productId: 0, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LoadItem, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!machineId || !operatorId || items.length === 0 || items.some(i => !i.productId || i.quantity <= 0)) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill all required fields and ensure quantities are valid.",
        variant: "destructive"
      });
      return;
    }

    createLoad.mutate({
      data: {
        clientMachineId: machineId,
        operatorId,
        items
      }
    }, {
      onSuccess: () => {
        toast({ title: "Load Recorded Successfully!" });
        setClientId(null);
        setMachineId(null);
        setItems([]);
        setScannedBadge(null);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2 mb-8">
        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <Coffee className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Record Machine Load</h1>
        <p className="text-muted-foreground">Register restocked items for a client machine</p>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Location & Staff</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setScannerOpen(true)}
          >
            <QrCode className="w-4 h-4" />
            Scan QR
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {scannedBadge && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-primary">{scannedBadge}</span>
              <Badge variant="secondary" className="ml-auto text-xs">QR Scanned</Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" /> Client Location
            </Label>
            <Select onValueChange={handleClientChange} value={clientId?.toString() || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.filter(c => c.hasContract).map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-muted-foreground" /> Machine
            </Label>
            <Select 
              disabled={!clientId} 
              onValueChange={(v) => { setMachineId(parseInt(v)); setItems([]); }} 
              value={machineId?.toString() || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder={!clientId ? "Select a client first" : "Select machine"} />
              </SelectTrigger>
              <SelectContent>
                {machines?.filter(m => m.isActive).map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.machineName} (#{m.machineNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" /> Operator
            </Label>
            <Select onValueChange={(v) => setOperatorId(parseInt(v))} value={operatorId?.toString() || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select your name" />
              </SelectTrigger>
              <SelectContent>
                {operators?.filter(o => o.isActive).map((o) => (
                  <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" /> Loaded Items
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
              No items added yet. Click "Add Item" to start.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-end gap-3 p-3 bg-muted/30 rounded-md border">
                  <div className="flex-1 space-y-2">
                    <Label>Product</Label>
                    <Select 
                      onValueChange={(v) => updateItem(index, "productId", parseInt(v))} 
                      value={item.productId ? item.productId.toString() : ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-2">
                    <Label>Qty</Label>
                    <Input 
                      type="number" 
                      min="0.1" 
                      step="0.1" 
                      value={item.quantity} 
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value))} 
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 shrink-0 mb-[2px]"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleSubmit}
            disabled={createLoad.isPending || !machineId || !operatorId || items.length === 0}
          >
            {createLoad.isPending ? "Submitting..." : "Submit Load Record"}
          </Button>
        </CardFooter>
      </Card>

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleQrScan}
      />
    </div>
  );
}
