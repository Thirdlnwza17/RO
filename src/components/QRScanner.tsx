"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface ScannerConfig {
  fps: number;
  qrbox: { width: number; height: number };
  formatsToSupport?: Html5QrcodeSupportedFormats[];
  experimentalFeatures?: {
    useBarCodeDetectorIfSupported?: boolean;
  };
  rememberLastUsedCamera?: boolean;
  showTorchButtonIfSupported?: boolean;
}

interface QrCodeScannerProps {
  onScanSuccess: (decodedText: string, type: string) => void;
  onScanFailure?: (error: string) => void;
}

export default function QrCodeScanner({ onScanSuccess, onScanFailure }: QrCodeScannerProps) {
  const qrRegionId = "qr-code-region";
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightBox, setHighlightBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  const requestCameraPermission = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError("ไม่สามารถเข้าถึงกล้องได้: " + error.message);
        setPermissionGranted(false);
      } finally {
        setIsLoading(false);
      }
  };

  const detectCodeType = (text: string): string => {
    if (text.startsWith("http")) return "URL";
    if (/^\d{8,14}$/.test(text)) return "Barcode";
    return "QR/Other";
  };

  const startScanner = async () => {
    if (!isClient) return;

    try {
      const Html5QrcodeModule = await import("html5-qrcode");
      const scanner = new Html5QrcodeModule.Html5Qrcode(qrRegionId, true);
      html5QrCodeRef.current = scanner;

      const config: ScannerConfig = {
        fps: 15,
        qrbox: { width: 300, height: 200 },
        // ครอบคลุมทุกชนิดของ QR/Barcode
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.MAXICODE,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.RSS_14,
          Html5QrcodeSupportedFormats.RSS_EXPANDED,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION
        ],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText, result) => {
          try {
            const container = document.getElementById(qrRegionId);
            if (container) {
              const rect = container.getBoundingClientRect();
              const size = Math.min(rect.width, rect.height) * 0.7;
              setHighlightBox({
                x: (rect.width - size) / 2,
                y: (rect.height - size) / 2,
                width: size,
                height: size,
              });
            }

            const type = detectCodeType(decodedText);
            onScanSuccess(decodedText, type);
          } catch (err) {
            console.error("Processing error:", err);
          }
        },
        (errMsg) => {
          if (!errMsg.includes("NotFoundException")) onScanFailure?.(errMsg);
        }
      );
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError("เริ่มสแกนไม่สำเร็จ: " + error.message);
      }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop();
      html5QrCodeRef.current.clear();
      html5QrCodeRef.current = null;
      setHighlightBox(null);
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  useEffect(() => {
    if (permissionGranted) {
      const timer = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(timer);
    }
  }, [permissionGranted]);

  if (!isClient) return <div>Loading...</div>;

  return (
    <div className="flex flex-col items-center relative">
      {!permissionGranted ? (
        <div className="w-[300px] h-[300px] bg-blue-50 border border-blue-200 flex flex-col items-center justify-center rounded-lg">
          <p className="text-blue-600 mb-2">📷 เข้าถึงกล้อง</p>
          <button
            onClick={requestCameraPermission}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "กำลังขอสิทธิ์..." : "เปิดใช้งานกล้อง"}
          </button>
        </div>
      ) : (
        <>
          <div id={qrRegionId} className="w-[100%] max-w-[400px] h-[250px] rounded-lg overflow-hidden relative" />
          {highlightBox && (
            <div
              style={{
                position: "absolute",
                border: "2px solid lime",
                left: highlightBox.x,
                top: highlightBox.y,
                width: highlightBox.width,
                height: highlightBox.height,
                pointerEvents: "none"
              }}
            />
          )}
        </>
      )}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
