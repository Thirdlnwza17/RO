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
  const qrCodeRegionId = "qr-code-region";
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);

  const startScanner = async () => {
    // ตรวจสอบว่าอุปกรณ์รองรับกล้องไหม
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("📵 อุปกรณ์ของคุณไม่รองรับการสแกน QR หรือเปิดกล้องไม่ได้");
      return;
    }

    const container = document.getElementById(qrCodeRegionId);
    if (!container) {
      console.error("❌ QR container not found.");
      return;
    }

    if (isScanningRef.current) {
      console.log("⚠️ Scanner already running, skip.");
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      html5QrCodeRef.current = html5QrCode;

      // ดึง list กล้อง
      const devices: CameraDevice[] = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        alert("❌ ไม่พบกล้องบนอุปกรณ์นี้");
        return;
      }

      // เลือกกล้องหลัง ถ้าไม่มีใช้ตัวแรก
      const backCamera = devices.find(d => d.label.toLowerCase().includes("back")) || devices[0];

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5QrCode.start(
        { deviceId: { exact: backCamera.id } },
        config,
        (decodedText) => {
          console.log("✅ QR Code detected:", decodedText);
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          if (
            !errorMessage.includes("NotFoundException") &&
            !errorMessage.includes("IndexSizeError")
          ) {
            console.warn("⚠️ QR Scan Error:", errorMessage);
            onScanFailure?.(errorMessage);
          }
        }
      );

      isScanningRef.current = true;
      setIsScanning(true);
      console.log("📷 QR scanner started with camera:", backCamera.label);
    } catch (err) {
      alert(
        "❌ ไม่สามารถเปิดกล้องได้ ตรวจสอบ HTTPS / permission ของอุปกรณ์ หรือ Safari iOS ไม่รองรับ"
      );
      console.error(err);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .finally(() => {
            isScanningRef.current = false;
            setIsScanning(false);
            console.log("🛑 QR scanner stopped.");
          })
          .catch((err) => console.error("❌ Stop scanner error:", err));
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        id={qrCodeRegionId}
        className={`w-[300px] h-[300px] rounded ${
          isScanning ? "" : "bg-gray-100"
        }`}
      />
      {!isScanning && (
        <button
          onClick={startScanner}
          className="px-4 py-2 bg-blue-500 text-white rounded mt-4"
        >
          📷 เปิดกล้องสแกน QR
        </button>
      )}
      <p className="mt-2 text-sm text-gray-600">
        ส่องกล้องไปที่ QR Code
      </p>
    </div>
  );
}
