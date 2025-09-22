"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const startScanner = async () => {
      const container = document.getElementById(qrCodeRegionId);
      if (!container) {
        console.error("❌ QR container not found.");
        return;
      }

      if (isScanningRef.current) {
        console.log("⚠️ Scanner already running, skip.");
        return;
      }

      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            console.log("✅ QR Code detected:", decodedText);
            onScanSuccess(decodedText);
          },
          (errorMessage: string) => {
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
        console.log("📷 QR scanner started.");
      } catch (err) {
        console.error("❌ Failed to start QR scanner:", err);
      }
    };

    // ✅ delay นิดนึงกัน DOM ยังไม่พร้อม
    const timer = setTimeout(startScanner, 500);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
            isScanningRef.current = false;
            console.log("🛑 QR scanner stopped.");
          })
          .catch((err) => console.error("❌ Stop scanner error:", err));
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="flex flex-col items-center">
      <div id={qrCodeRegionId} className="w-[300px] h-[300px]" />
      <p className="mt-2 text-sm text-gray-600">
        📷 ส่องกล้องไปที่ QR Code
      </p>
    </div>
  );
}
