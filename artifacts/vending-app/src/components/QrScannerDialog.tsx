import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Camera, AlertCircle } from "lucide-react";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (clientId: number, machineId: number) => void;
}

export function QrScannerDialog({ open, onOpenChange, onScan }: QrScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setError(null);
      setScanning(false);
      return;
    }

    const reader = new BrowserQRCodeReader();
    setScanning(true);
    setError(null);

    const startScanner = async () => {
      try {
        const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
        const backCamera = videoInputDevices.find(d =>
          d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear") || d.label.toLowerCase().includes("environment")
        ) ?? videoInputDevices[0];

        if (!backCamera) {
          setError("No camera found. Please allow camera access.");
          setScanning(false);
          return;
        }

        controlsRef.current = await reader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText();
              try {
                const url = new URL(text);
                const clientId = parseInt(url.searchParams.get("clientId") ?? "");
                const machineId = parseInt(url.searchParams.get("machineId") ?? "");
                if (!isNaN(clientId) && !isNaN(machineId)) {
                  controlsRef.current?.stop();
                  onScan(clientId, machineId);
                  onOpenChange(false);
                } else {
                  setError("QR code is not a valid machine code. Try again.");
                }
              } catch {
                setError("QR code is not a valid machine code. Try again.");
              }
            }
          }
        );
        setScanning(true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Permission") || msg.includes("permission")) {
          setError("Camera permission denied. Please allow camera access in your browser settings.");
        } else {
          setError("Could not start camera: " + msg);
        }
        setScanning(false);
      }
    };

    startScanner();

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Scan Machine QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at the QR code on the machine to auto-fill the form.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square w-full max-w-xs mx-auto">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-md" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-md" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-md" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-md" />
                {scanning && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-primary/70 animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                )}
              </div>
            </div>
            {!scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Camera className="w-10 h-10 text-white animate-pulse" />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
