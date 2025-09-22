"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, CameraDevice } from "html5-qrcode";

interface QrCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

export default function QrCodeScanner({
  onScanSuccess,
  onScanFailure,
}: QrCodeScannerProps) {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRegionRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeRegionId] = useState(() => `qr-region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // ตรวจสอบ iOS
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  // ตรวจสอบ Safari
  const isSafari = () => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Camera permission denied:", error);
      return false;
    }
  };

  const forceCleanup = () => {
    if (qrRegionRef.current) {
      // สร้าง div ใหม่เพื่อแทนที่ div เก่าที่ถูก html5-qrcode modify
      const newDiv = document.createElement('div');
      newDiv.id = qrCodeRegionId;
      newDiv.className = qrRegionRef.current.className;
      
      const parent = qrRegionRef.current.parentNode;
      if (parent) {
        parent.replaceChild(newDiv, qrRegionRef.current);
        qrRegionRef.current = newDiv;
      }
    }
  };

  const stopScanner = async () => {
    if (!mountedRef.current) return;
    
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        // หยุด scanner ก่อน
        await html5QrCodeRef.current.stop();
        
        // รอให้ scanner หยุดสมบูรณ์
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (mountedRef.current) {
          try {
            html5QrCodeRef.current.clear();
          } catch (clearErr) {
            console.warn("Clear error (will force cleanup):", clearErr);
            forceCleanup();
          }
        }
        
      } catch (err) {
        console.error("Stop scanner error:", err);
        forceCleanup();
      } finally {
        html5QrCodeRef.current = null;
      }
    }
    
    if (mountedRef.current) {
      isScanningRef.current = false;
      setIsScanning(false);
      console.log("🛑 QR scanner stopped.");
    }
  };

  const startScanner = async () => {
    if (!mountedRef.current) return;
    
    setError("");
    setIsLoading(true);

    // ตรวจสอบการรองรับ
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = isIOS() 
        ? "📵 iOS ต้องใช้ Safari และเปิดเว็บผ่าน HTTPS เท่านั้น" 
        : "📵 อุปกรณ์ของคุณไม่รองรับการสแกน QR หรือเปิดกล้องไม่ได้";
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    if (isIOS() && !isSafari()) {
      setError("📱 iOS แนะนำให้เปิดใน Safari Browser สำหรับประสิทธิภาพที่ดีที่สุด");
    }

    if (isScanningRef.current) {
      console.log("⚠️ Scanner already running, skip.");
      setIsLoading(false);
      return;
    }

    // ตรวจสอบ container
    if (!qrRegionRef.current) {
      console.error("❌ QR container ref not found.");
      setIsLoading(false);
      return;
    }

    try {
      // ขอ permission ก่อน
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setError("❌ ไม่ได้รับอนุญาตให้ใช้งานกล้อง กรุณาอนุญาตการใช้งานกล้องในการตั้งค่าเบราว์เซอร์");
        setIsLoading(false);
        return;
      }

      // สร้าง scanner instance ใหม่
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      html5QrCodeRef.current = html5QrCode;

      // ดึง list กล้อง
      const devices: CameraDevice[] = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError("❌ ไม่พบกล้องบนอุปกรณ์นี้");
        setIsLoading(false);
        return;
      }

      // เลือกกล้อง
      let selectedCamera = devices[0];
      
      if (isIOS()) {
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("environment") ||
          d.label.toLowerCase().includes("rear")
        );
        if (backCamera) selectedCamera = backCamera;
      } else {
        const backCamera = devices.find(d => d.label.toLowerCase().includes("back"));
        if (backCamera) selectedCamera = backCamera;
      }

      // Config
      const config = {
        fps: isIOS() ? 5 : 10,
        qrbox: { width: isIOS() ? 200 : 250, height: isIOS() ? 200 : 250 },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // เริ่มสแกน
      await html5QrCode.start(
        { deviceId: { exact: selectedCamera.id } },
        config,
        (decodedText) => {
          if (mountedRef.current) {
            console.log("✅ QR Code detected:", decodedText);
            onScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          if (
            !errorMessage.includes("NotFoundException") &&
            !errorMessage.includes("IndexSizeError") &&
            !errorMessage.includes("No MultiFormat Readers") &&
            mountedRef.current
          ) {
            console.warn("⚠️ QR Scan Error:", errorMessage);
            onScanFailure?.(errorMessage);
          }
        }
      );

      if (mountedRef.current) {
        isScanningRef.current = true;
        setIsScanning(true);
        setIsLoading(false);
        console.log("📷 QR scanner started with camera:", selectedCamera.label);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      
      setIsLoading(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      let errorMessage = "❌ ไม่สามารถเปิดกล้องได้";
      
      if (isIOS()) {
        errorMessage += " (iOS: ตรวจสอบ HTTPS, permission และใช้ Safari)";
      } else {
        errorMessage += " (ตรวจสอบ HTTPS และ permission ของเบราว์เซอร์)";
      }
      
      if (errorMsg.includes("Permission denied")) {
        errorMessage = "❌ ไม่ได้รับอนุญาตให้ใช้งานกล้อง กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์";
      } else if (errorMsg.includes("NotFoundError")) {
        errorMessage = "❌ ไม่พบกล้องที่สามารถใช้งานได้";
      } else if (errorMsg.includes("NotAllowedError")) {
        errorMessage = "❌ การเข้าถึงกล้องถูกปฏิเสธ กรุณาตรวจสอบการตั้งค่าความปลอดภัย";
      }
      
      setError(errorMessage);
      console.error(err);
    }
  };

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Immediate cleanup
      if (html5QrCodeRef.current && isScanningRef.current) {
        html5QrCodeRef.current.stop()
          .catch(() => {})
          .finally(() => {
            html5QrCodeRef.current = null;
            isScanningRef.current = false;
          });
      }
    };
  }, []);

  // แยก QR Region เป็น component ย่อย
  const QRRegion = () => (
    <div
      ref={qrRegionRef}
      id={qrCodeRegionId}
      className={`w-[300px] h-[300px] rounded-lg border-2 border-dashed ${
        isScanning 
          ? "border-green-400 bg-black" 
          : "border-gray-300 bg-gray-100"
      } flex items-center justify-center relative overflow-hidden`}
      style={{ isolation: 'isolate' }} // CSS isolation
    />
  );

  return (
    <div className="flex flex-col items-center max-w-md mx-auto p-4">
      {/* แสดงข้อมูลระบบ */}
      {isIOS() && (
        <div className="mb-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
          📱 iOS Device - แนะนำใช้ Safari Browser
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Container wrapper */}
      <div ref={containerRef} className="relative">
        <QRRegion />
        
        {/* Overlay content */}
        {!isScanning && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-500 text-center">
              <div className="text-4xl mb-2">📷</div>
              <div className="text-sm">กดปุ่มเพื่อเริ่มสแกน</div>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-500 text-center">
              <div className="text-2xl mb-2">⏳</div>
              <div className="text-sm">กำลังเปิดกล้อง...</div>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="mt-4 flex gap-2">
        {!isScanning && !isLoading && (
          <button
            onClick={startScanner}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            📷 เปิดกล้องสแกน QR
          </button>
        )}
        
        {isScanning && (
          <button
            onClick={stopScanner}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            🛑 หยุดสแกน
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {isScanning ? "ส่องกล้องไปที่ QR Code" : "กดปุ่มเพื่อเริ่มสแกน QR Code"}
        </p>
        
        {isIOS() && (
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p>💡 สำหรับ iOS:</p>
            <p>• ใช้ Safari Browser</p>
            <p>• เปิดผ่าน HTTPS เท่านั้น</p>
            <p>• อนุญาตการใช้งานกล้องเมื่อถูกถาม</p>
          </div>
        )}
      </div>
    </div>
  );
}