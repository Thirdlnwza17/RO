"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Custom type for QR code result with detection points
type DetectionPoint = {
  x: number;
  y: number;
};

// Extended type for QR code scanning result
interface QrCodeScanResult {
  decodedText: string;
  resultPoints?: DetectionPoint[];
}

interface QrCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

export default function QrCodeScanner({
  onScanSuccess,
  onScanFailure,
}: QrCodeScannerProps) {
  const qrCodeRegionId = "qr-code-region";
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [highlightBox, setHighlightBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  const [isClient, setIsClient] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsSecureContext(window.location.protocol === 'https:' || window.location.hostname === 'localhost');
  }, []);

  const detectCodeType = (text: string): string => {
    if (text.startsWith('http://') || text.startsWith('https://')) return 'URL';
    if (text.includes('@') && text.includes('.')) return 'Email';
    if (/^\+?[\d\s-()]+$/.test(text) && text.replace(/\D/g, '').length >= 10) return 'Phone';
    if (text.startsWith('WIFI:')) return 'WiFi';
    if (text.startsWith('BEGIN:VCARD') || text.startsWith('MECARD:')) return 'Contact';
    if (text.startsWith('SMSTO:') || text.startsWith('sms:')) return 'SMS';
    if (text.startsWith('geo:')) return 'Location';
    if (text.startsWith('BEGIN:VEVENT')) return 'Calendar Event';
    if (text.startsWith('bitcoin:') || text.startsWith('ethereum:')) return 'Cryptocurrency';
    if (/^\d{8,14}$/.test(text)) return 'Product Barcode';
    return 'Text';
  };

  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ Camera permission error:", error);
      setError(`ไม่สามารถเข้าถึงกล้องได้: ${error.message}`);
      setPermissionGranted(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loadHtml5QrCode = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      return Html5Qrcode;
    } catch (err) {
      console.error("❌ Failed to load html5-qrcode:", err);
      throw new Error("Failed to load QR scanner library");
    }
  };

  const startScanner = async () => {
    if (!isClient || !isSecureContext) {
      setError("QR Scanner ต้องใช้งานในสภาพแวดล้อมที่ปลอดภัย (HTTPS)");
      return;
    }
    const container = document.getElementById(qrCodeRegionId);
    if (!container) {
      console.error("❌ QR container not found.");
      return;
    }
    if (isScanningRef.current || html5QrCodeRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      const Html5Qrcode = await loadHtml5QrCode();
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 320, height: 180 }, // กรอบใหญ่และกว้างสำหรับ 1D Barcode
        aspectRatio: 2.0,
        supportedScanTypes: Array.from({ length: 17 }, (_, i) => i),
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      };

      let isProcessing = false;

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText: string) => {
          // For now, we'll just show a small indicator where the code was detected
          // The actual detection box is not available in the standard API
          const container = document.getElementById(qrCodeRegionId);
          if (container) {
            const rect = container.getBoundingClientRect();
            const size = Math.min(rect.width, rect.height) * 0.3; // 30% of container size
            setHighlightBox({
              x: (rect.width - size) / 2,
              y: (rect.height - size) / 2,
              width: size,
              height: size,
            });
          }

          if (isProcessing) return;
          isProcessing = true;

          try {
            console.log("✅ QR/Barcode detected:", decodedText);
            const analysis = detectCodeType(decodedText);
            console.log(`📋 Detected: ${analysis}`);
            onScanSuccess(decodedText);
            await stopScanner();
          } catch (err) {
            console.error("Error processing QR code:", err);
          } finally {
            isProcessing = false;
          }
        },
        (errorMessage: string) => {
          if (!errorMessage.includes("NotFoundException") && !errorMessage.includes("IndexSizeError") && !errorMessage.includes("No MultiFormat Readers")) {
            console.warn("⚠️ QR Scan Error:", errorMessage);
            onScanFailure?.(errorMessage);
          }
        }
      );

      isScanningRef.current = true;
      setIsLoading(false);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ Failed to start QR scanner:", error);
      setError(`เริ่มสแกนไม่สำเร็จ: ${error.message}`);
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        const scanner = html5QrCodeRef.current as { stop: () => Promise<void>; clear: () => void; };
        await scanner.stop();
        scanner.clear();
        html5QrCodeRef.current = null;
        isScanningRef.current = false;
        setHighlightBox(null);
        console.log("🛑 QR scanner stopped.");
      } catch (err: unknown) {
        console.error("❌ Stop scanner error:", err);
      }
    }
  };

  useEffect(() => { return () => { stopScanner(); }; }, []);
  useEffect(() => { if (permissionGranted && isClient && isSecureContext) { const timer = setTimeout(startScanner, 500); return () => clearTimeout(timer); } }, [permissionGranted, isClient, isSecureContext, onScanSuccess, onScanFailure]);

  if (!isClient) return <div className="flex flex-col items-center p-4"><div className="w-[300px] h-[300px] bg-gray-200 rounded-lg flex items-center justify-center"><span className="text-gray-500">กำลังโหลด...</span></div></div>;
  if (!isSecureContext) return <div className="flex flex-col items-center p-4"><div className="w-[300px] h-[300px] bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center"><div className="text-center p-4"><p className="text-red-600 font-semibold mb-2">🔒 ต้องใช้ HTTPS</p><p className="text-sm text-red-500">QR Scanner ต้องใช้งานผ่าน HTTPS เท่านั้น</p></div></div></div>;

  return (
    <div className="flex flex-col items-center p-4 relative">
      {!permissionGranted ? (
        <div className="w-[300px] h-[300px] bg-blue-50 border-2 border-blue-200 rounded-lg flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-blue-600 font-semibold mb-4">📷 เข้าถึงกล้อง</p>
            <button
              onClick={requestCameraPermission}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? "กำลังขอสิทธิ์..." : "เปิดใช้งานกล้อง"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div id={qrCodeRegionId} className="w-[100%] max-w-[400px] h-[250px] rounded-lg overflow-hidden relative" />
          {highlightBox && (
            <div
              style={{
                position: 'absolute',
                border: '2px solid lime',
                left: highlightBox.x,
                top: highlightBox.y,
                width: highlightBox.width,
                height: highlightBox.height,
                pointerEvents: 'none',
              }}
            />
          )}
          {isLoading && <p className="mt-2 text-sm text-blue-600">📷 กำลังเปิดกล้อง...</p>}
        </>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-center">
          <p className="text-sm text-red-600">❌ {error}</p>
          <button onClick={() => { setError(null); setPermissionGranted(false); }} className="mt-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">ลองใหม่</button>
        </div>
      )}
    </div>
  );
}
