"use client";

import { useEffect, useRef, useState } from "react";

interface QrCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

export default function QrCodeScanner({
  onScanSuccess,
  onScanFailure,
}: QrCodeScannerProps) {
  const qrCodeRegionId = "qr-code-region";
  const html5QrCodeRef = useRef<unknown>(null);
  const isScanningRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // ตรวจสอบว่าเป็น client-side และมี secure context
  const [isClient, setIsClient] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsSecureContext(window.location.protocol === 'https:' || window.location.hostname === 'localhost');
  }, []);

  // ขอสิทธิ์เข้าถึงกล้อง
  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // ตรวจสอบว่ามี MediaDevices API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // ขอสิทธิ์เข้าถึงกล้อง
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      // หยุด stream ทันที (เราแค่ต้องการสิทธิ์)
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

  // โหลด html5-qrcode แบบ dynamic import
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

    if (isScanningRef.current || html5QrCodeRef.current) {
      console.log("⚠️ Scanner already running, skip.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // โหลด library
      const Html5Qrcode = await loadHtml5QrCode();
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      html5QrCodeRef.current = html5QrCode as unknown;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // เริ่มสแกน
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText: string) => {
          console.log("✅ QR Code detected:", decodedText);
          onScanSuccess(decodedText);
        },
        (errorMessage: string) => {
          // กรองข้อผิดพลาดที่ไม่สำคัญ
          if (
            !errorMessage.includes("NotFoundException") &&
            !errorMessage.includes("IndexSizeError") &&
            !errorMessage.includes("No MultiFormat Readers")
          ) {
            console.warn("⚠️ QR Scan Error:", errorMessage);
            onScanFailure?.(errorMessage);
          }
        }
      );

      isScanningRef.current = true;
      console.log("📷 QR scanner started.");
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
        const scanner = html5QrCodeRef.current as {
          stop: () => Promise<void>;
          clear: () => void;
        };
        await scanner.stop();
        scanner.clear();
        html5QrCodeRef.current = null;
        isScanningRef.current = false;
        console.log("🛑 QR scanner stopped.");
      } catch (err: unknown) {
        console.error("❌ Stop scanner error:", err);
      }
    }
  };

  // Cleanup เมื่อ component unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // เริ่มสแกนอัตโนมัติเมื่อได้รับสิทธิ์
  useEffect(() => {
    if (permissionGranted && isClient && isSecureContext) {
      const timer = setTimeout(startScanner, 500);
      return () => clearTimeout(timer);
    }
  }, [permissionGranted, isClient, isSecureContext, onScanSuccess, onScanFailure]);

  // แสดงข้อความเมื่อไม่อยู่ในสภาพแวดล้อมที่ปลอดภัย
  if (!isClient) {
    return (
      <div className="flex flex-col items-center p-4">
        <div className="w-[300px] h-[300px] bg-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-500">กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  if (!isSecureContext) {
    return (
      <div className="flex flex-col items-center p-4">
        <div className="w-[300px] h-[300px] bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-red-600 font-semibold mb-2">🔒 ต้องใช้ HTTPS</p>
            <p className="text-sm text-red-500">
              QR Scanner ต้องใช้งานผ่าน HTTPS เท่านั้น
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4">
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
          <div id={qrCodeRegionId} className="w-[300px] h-[300px] rounded-lg overflow-hidden" />
          {isLoading && (
            <p className="mt-2 text-sm text-blue-600">📷 กำลังเปิดกล้อง...</p>
          )}
          {isScanningRef.current && (
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-600 mb-2">📷 ส่องกล้องไปที่ QR Code</p>
              <button
                onClick={stopScanner}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              >
                หยุดสแกน
              </button>
            </div>
          )}
        </>
      )}
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-center">
          <p className="text-sm text-red-600">❌ {error}</p>
          <button
            onClick={() => {
              setError(null);
              setPermissionGranted(false);
            }}
            className="mt-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            ลองใหม่
          </button>
        </div>
      )}
    </div>
  );
}