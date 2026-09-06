import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, Zap, ZapOff, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface CameraBarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  onScan,
  isOpen,
  onClose,
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ code: string; time: number } | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-barcode-viewport';

  // Load available cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function getCameras() {
      try {
        setErrorMessage(null);
        const devices = await Html5Qrcode.getCameras();
        if (mounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available, otherwise default to first camera
          const backCam = devices.find((d) =>
            /back|rear|environment/i.test(d.label)
          );
          setActiveCameraId(backCam ? backCam.id : devices[0].id);
        } else if (mounted) {
          setErrorMessage('No camera devices detected on this device.');
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(
            err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in your browser settings.'
              : 'Unable to access camera hardware: ' + (err.message || 'Unknown error')
          );
        }
      }
    }

    getCameras();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Start scanner when camera is selected & component is open
  useEffect(() => {
    if (!isOpen || !activeCameraId) return;

    const html5QrCode = new Html5Qrcode(scannerContainerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
    });

    qrScannerRef.current = html5QrCode;

    const config = {
      fps: 15,
      qrbox: { width: 260, height: 160 },
      aspectRatio: 1.333334,
    };

    html5QrCode
      .start(
        activeCameraId,
        config,
        (decodedText) => {
          const now = Date.now();
          // Prevent repeat scans of identical code within 1.5 seconds
          if (lastScanned && lastScanned.code === decodedText && now - lastScanned.time < 1500) {
            return;
          }
          setLastScanned({ code: decodedText, time: now });
          onScan(decodedText);
        },
        () => {
          // Frame scan failure is normal when no barcode is in frame; ignore
        }
      )
      .then(() => {
        setIsScanning(true);
        // Check for torch capability
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          if ((capabilities as any).torch) {
            setHasTorch(true);
          }
        } catch {
          // Torch not supported
        }
      })
      .catch((err: any) => {
        setErrorMessage('Failed to start camera feed: ' + (err.message || err));
        setIsScanning(false);
      });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch(() => {});
      } else {
        html5QrCode.clear();
      }
      setIsScanning(false);
      setTorchOn(false);
    };
  }, [isOpen, activeCameraId, onScan]);

  const toggleTorch = async () => {
    if (!qrScannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await qrScannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setTorchOn(nextState);
    } catch {
      // Failed to toggle torch
    }
  };

  const handleStopAndClose = async () => {
    if (qrScannerRef.current && isScanning) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      } catch {
        // Ignore stop error
      }
    }
    setIsScanning(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Camera Barcode Scanner"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg rounded-3xl bg-neo-card border-4 border-black p-5 sm:p-6 shadow-neo-xl space-y-4 text-neo-text">
        {/* Header */}
        <div className="flex items-center justify-between border-b-3 border-black pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neo-lime text-black border-3 border-black shadow-neo-sm">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight">
                Live Barcode Scanner
              </h3>
              <p className="text-xs text-neo-muted font-bold">
                Position supermarket barcode inside the viewfinder box
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStopAndClose}
            aria-label="Close scanner"
            className="rounded-xl p-2 bg-neo-surface hover:bg-neo-pink hover:text-white border-2 border-black shadow-neo-sm transition-all cursor-pointer"
          >
            <CameraOff className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Selector & Flash Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {cameras.length > 1 ? (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <RefreshCw className="h-4 w-4 text-neo-muted shrink-0" />
              <select
                value={activeCameraId}
                onChange={(e) => setActiveCameraId(e.target.value)}
                className="w-full rounded-xl border-2 border-black bg-neo-surface px-3 py-1.5 text-xs font-bold text-neo-text focus:outline-hidden"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${cam.id.slice(0, 5)}...`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-[11px] font-mono font-bold text-neo-muted">
              Camera: {cameras[0]?.label || 'Active Web Camera'}
            </div>
          )}

          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`flex items-center gap-1.5 rounded-xl border-2 border-black px-3 py-1.5 text-xs font-black uppercase transition-all cursor-pointer ${
                torchOn ? 'bg-neo-yellow text-black' : 'bg-neo-surface text-neo-text'
              }`}
            >
              {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
              <span>{torchOn ? 'Flash On' : 'Flash Off'}</span>
            </button>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-neo-pink text-white border-3 border-black text-xs font-bold flex items-start gap-2 shadow-neo-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-black uppercase tracking-wider">Camera Error</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Viewfinder Container */}
        <div className="relative overflow-hidden rounded-2xl border-3 border-black bg-black shadow-neo aspect-4/3 flex items-center justify-center">
          <div
            id={scannerContainerId}
            className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Animated Laser Beam & Corner Markers Overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Viewfinder Box */}
            <div className="relative w-[260px] h-[160px] border-2 border-dashed border-neo-lime/80 rounded-xl">
              {/* Corner Accents */}
              <div className="absolute -left-1 -top-1 w-4 h-4 border-l-4 border-t-4 border-neo-lime" />
              <div className="absolute -right-1 -top-1 w-4 h-4 border-r-4 border-t-4 border-neo-lime" />
              <div className="absolute -left-1 -bottom-1 w-4 h-4 border-l-4 border-b-4 border-neo-lime" />
              <div className="absolute -right-1 -bottom-1 w-4 h-4 border-r-4 border-b-4 border-neo-lime" />

              {/* Animated Laser Scan Beam */}
              <div className="absolute inset-x-2 top-0 h-1 bg-neo-pink shadow-[0_0_12px_#ff007f] animate-pulse transition-all" />
            </div>
          </div>

          {/* Last Scanned Tag */}
          {lastScanned && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-neo-lime text-black border-2 border-black font-mono font-black text-xs px-3 py-1 rounded-lg shadow-neo-sm">
              Detected: {lastScanned.code}
            </div>
          )}
        </div>

        {/* Supported Format Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono font-bold text-neo-muted border-t-2 border-black/10">
          <span>Supported Formats:</span>
          <div className="flex gap-1.5">
            <span className="bg-neo-surface px-1.5 py-0.5 rounded border border-black">EAN-13</span>
            <span className="bg-neo-surface px-1.5 py-0.5 rounded border border-black">UPC-A</span>
            <span className="bg-neo-surface px-1.5 py-0.5 rounded border border-black">CODE-128</span>
            <span className="bg-neo-surface px-1.5 py-0.5 rounded border border-black">QR</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleStopAndClose}
            className="w-full justify-center"
          >
            Done Scanning / Close Camera
          </Button>
        </div>
      </div>
    </div>
  );
};
