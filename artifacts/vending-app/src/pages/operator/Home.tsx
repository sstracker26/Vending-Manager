import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MapPin, Coffee, Users, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoadItem {
  productId: number;
  quantity: number;
}

export default function OperatorHome() {
  const [clientId, setClientId] = useState<number | null>(null);
  const [machineId, setMachineId] = useState<number | null>(null);
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const [items, setItems] = useState<LoadItem[]>([]);
  
  const { data: clients } = useListClients();
  const { data: machines } = useListClientMachines(clientId || 0, {
    query: { enabled: !!clientId }
  });
  const { data: products } = useListProducts();
  const { data: operators } = useListOperators();
  
  const createLoad = useCreateMachineLoad();
  const { toast } = useToast();

  const handleClientChange = (val: string) => {
    setClientId(parseInt(val));
    setMachineId(null);
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
        <CardHeader>
          <CardTitle>Location & Staff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> Client Location</Label>
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
            <Label className="flex items-center gap-2"><Coffee className="w-4 h-4 text-muted-foreground" /> Machine</Label>
            <Select 
              disabled={!clientId} 
              onValueChange={(v) => setMachineId(parseInt(v))} 
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
            <Label className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> Operator</Label>
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
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0 mb-[2px]" onClick={() => removeItem(index)}>
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
    </div>
  );
}
