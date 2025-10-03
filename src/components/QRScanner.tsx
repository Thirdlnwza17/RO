"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  BrowserMultiFormatReader,
  Result,
  BarcodeFormat,
  DecodeHintType,
  NotFoundException
} from "@zxing/library";

interface QrCodeScannerProps {
  onScanSuccess: (decodedText: string, type: string) => void;
  onScanFailure?: (error: string) => void;
}

interface HighlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ScanError = Error | NotFoundException;

export default function QrCodeScanner({
  onScanSuccess,
  onScanFailure
}: QrCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightBox, setHighlightBox] = useState<HighlightBox | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const detectCodeType = useCallback((text: string): string => {
    // URL detection
    if (text.match(/^https?:\/\//i)) return "URL";
    if (text.match(/^www\./i)) return "URL";
    
    // Email detection
    if (text.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return "Email";
    
    // Phone number detection
    if (text.match(/^[\+]?[\d\s\-\(\)]{8,}$/)) return "Phone";
    
    // UPC/EAN Barcode detection (8-14 digits)
    if (text.match(/^\d{8,14}$/)) return "Barcode (UPC/EAN)";
    
    // WiFi QR format
    if (text.startsWith("WIFI:")) return "WiFi Config";
    
    // VCard format
    if (text.startsWith("BEGIN:VCARD")) return "Contact Card";
    
    // SMS format
    if (text.startsWith("SMS:") || text.startsWith("SMSTO:")) return "SMS";
    
    // Calendar event
    if (text.startsWith("BEGIN:VEVENT")) return "Calendar Event";
    
    // Location/GPS
    if (text.match(/^geo:/i)) return "Location";
    
    // Default for QR codes
    return "QR Code";
  }, []);

  const initializeCodeReader = useCallback(() => {
    if (!codeReaderRef.current) {
      const codeReader = new BrowserMultiFormatReader();
      
      // Configure to support all barcode formats
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.EAN_8,
        BarcodeFormat.EAN_13,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODE_128,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
        BarcodeFormat.RSS_14,
        BarcodeFormat.RSS_EXPANDED,
        BarcodeFormat.AZTEC,
        BarcodeFormat.PDF_417,
        BarcodeFormat.MAXICODE
      ]);
      
      // Enhanced detection settings for better performance
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.ASSUME_GS1, false); // Don't assume GS1 format
      hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
      
      codeReader.hints = hints;
      
      // Optimize scanning speed - reduce delay between attempts
      codeReader.timeBetweenDecodingAttempts = 25; // Faster scanning
      
      codeReaderRef.current = codeReader;
    }
    return codeReaderRef.current;
  }, []);

  const stopScanner = useCallback(async () => {
    console.log('Stopping scanner...');
    
    setIsScanning(false);
    
    // Stop the code reader
    if (codeReaderRef.current) {
      try {
        await codeReaderRef.current.reset();
      } catch (resetError) {
        console.warn('Error resetting code reader:', resetError);
      }
    }
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setHighlightBox(null);
    console.log('Scanner stopped successfully');
  }, []);

  const requestCameraPermission = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setError("กล้องไม่สามารถใช้งานในสภาพแวดล้อมนี้ได้ (ต้องใช้ HTTPS หรือ localhost)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Test camera access with fallback constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 480 },
          height: { ideal: 720, min: 360 },
          frameRate: { ideal: 30, min: 10 }
        },
        audio: false
      };
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (primaryError) {
        console.warn('Primary camera constraints failed, trying fallback:', primaryError);
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      
      // Test the stream briefly then stop it
      if (stream.getVideoTracks().length === 0) {
        throw new Error('ไม่พบกล้องที่พร้อมใช้งาน');
      }
      
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMessage = "ไม่สามารถเข้าถึงกล้องได้";
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = "กรุณาอนุญาตให้เข้าถึงกล้องในเบราว์เซอร์";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "ไม่พบกล้องในอุปกรณ์นี้";
        } else if (err.name === 'NotSupportedError') {
          errorMessage = "เบราว์เซอร์ไม่รองรับการใช้งานกล้อง";
        } else if (err.name === 'NotReadableError') {
          errorMessage = "กล้องกำลังถูกใช้งานโดยแอปพลิเคชันอื่น";
        } else {
          errorMessage += ": " + err.message;
        }
      }
      
      setError(errorMessage);
      setPermissionGranted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = useCallback(async () => {
    if (!permissionGranted || !videoRef.current || isScanning) return;

    try {
      setIsScanning(true);
      setError(null);
      
      const videoElement = videoRef.current;
      const codeReader = initializeCodeReader();

      // Get video stream with progressive fallback - optimized for barcode scanning
      const getVideoStream = async (): Promise<MediaStream> => {
        const constraints = [
          // High quality with back camera - optimized for barcode scanning
          {
            video: {
              facingMode: { exact: 'environment' },
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              frameRate: { ideal: 60, min: 30 } // Higher frame rate for faster detection
            }
          },
          // Medium quality with back camera - balanced performance
          {
            video: {
              facingMode: 'environment',
              width: { ideal: 960, min: 640 },
              height: { ideal: 720, min: 480 },
              frameRate: { ideal: 60, min: 30 }
            }
          },
          // Basic quality any camera
          {
            video: {
              width: { ideal: 640, min: 320 },
              height: { ideal: 480, min: 240 },
              frameRate: { ideal: 30, min: 15 }
            }
          },
          // Minimal constraints
          { video: true }
        ];

        for (const constraint of constraints) {
          try {
            return await navigator.mediaDevices.getUserMedia(constraint);
          } catch (err) {
            console.warn('Failed constraint, trying next:', constraint, err);
          }
        }
        throw new Error('ไม่สามารถเปิดกล้องได้ด้วยการตั้งค่าใดๆ');
      };

      const stream = await getVideoStream();
      streamRef.current = stream;
      videoElement.srcObject = stream;
      
      await new Promise<void>((resolve, reject) => {
        videoElement.onloadedmetadata = () => resolve();
        videoElement.onerror = () => reject(new Error('Video loading failed'));
        setTimeout(() => reject(new Error('Video loading timeout')), 5000);
      });
      
      await videoElement.play();

      // Start decoding with enhanced performance
      await codeReader.decodeFromVideoDevice(
        null, // Let browser choose device
        videoElement,
        (result: Result | undefined, error?: ScanError) => {
          if (result) {
            try {
              const text = result.getText();
              if (text && text.trim()) {
                console.log('Scan successful:', text);
                const type = detectCodeType(text);
                
                // Set highlight box based on result points if available
                const resultPoints = result.getResultPoints();
                if (resultPoints && resultPoints.length >= 2 && videoElement) {
                  const videoRect = videoElement.getBoundingClientRect();
                  const scaleX = videoRect.width / videoElement.videoWidth;
                  const scaleY = videoRect.height / videoElement.videoHeight;
                  
                  const points = resultPoints.map(point => ({
                    x: point.getX() * scaleX,
                    y: point.getY() * scaleY
                  }));
                  
                  const minX = Math.min(...points.map(p => p.x));
                  const maxX = Math.max(...points.map(p => p.x));
                  const minY = Math.min(...points.map(p => p.y));
                  const maxY = Math.max(...points.map(p => p.y));
                  
                  setHighlightBox({
                    x: Math.max(0, minX - 10),
                    y: Math.max(0, minY - 10),
                    width: Math.min(videoRect.width, maxX - minX + 20),
                    height: Math.min(videoRect.height, maxY - minY + 20)
                  });
                } else {
                  // Fallback highlight box (center of video)
                  const width = videoElement.clientWidth * 0.7;
                  const height = videoElement.clientHeight * 0.7;
                  setHighlightBox({
                    x: (videoElement.clientWidth - width) / 2,
                    y: (videoElement.clientHeight - height) / 2,
                    width,
                    height
                  });
                }
                
                onScanSuccess(text.trim(), type);
                
                // Auto-stop after successful scan - faster response
                setTimeout(() => {
                  stopScanner();
                }, 500); // Reduced from 1000ms to 500ms for faster response
                
              } else {
                console.warn('Empty scan result');
              }
            } catch (parseError) {
              console.error('Error processing scan result:', parseError);
              onScanFailure?.("เกิดข้อผิดพลาดในการประมวลผลผลลัพธ์การสแกน");
            }
          } else if (error && !(error instanceof NotFoundException)) {
            // Only log actual errors, not normal "not found" cases
            if (error.message && !error.message.includes('No MultiFormat Readers')) {
              console.warn('Scan error:', error);
            }
            // Don't call onScanFailure for normal NotFoundException to avoid spam
          }
        }
      );

    } catch (err) {
      console.error('Scanner start error:', err);
      let errorMessage = "ไม่สามารถเริ่มการสแกนได้";
      
      if (err instanceof Error) {
        errorMessage += ": " + err.message;
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  }, [permissionGranted, isScanning, initializeCodeReader, detectCodeType, onScanSuccess, onScanFailure, stopScanner]);

  // Effect to start scanner when permission is granted - faster startup
  useEffect(() => {
    if (permissionGranted && !isScanning) {
      const timer = setTimeout(() => {
        startScanner();
      }, 200); // Reduced from 500ms to 200ms for faster startup

      return () => {
        clearTimeout(timer);
      };
    }
  }, [permissionGranted, startScanner, isScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
      if (codeReaderRef.current) {
        codeReaderRef.current = null;
      }
    };
  }, [stopScanner]);

  return (
    <div className="flex flex-col items-center relative">
      {!permissionGranted ? (
        <div className="w-[300px] h-[300px] bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 flex flex-col items-center justify-center rounded-xl shadow-lg">
          <div className="text-4xl mb-4">📱</div>
          <p className="text-blue-700 mb-4 text-center font-medium">
            ต้องการเข้าถึงกล้องเพื่อสแกน QR Code
          </p>
          <button
            onClick={requestCameraPermission}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังขอสิทธิ์...
              </div>
            ) : (
              "เปิดใช้งานกล้อง"
            )}
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-[400px] h-[300px] rounded-xl overflow-hidden shadow-lg bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />
          
          {/* Scanning overlay */}
          <div className="absolute inset-0 border-2 border-green-400 rounded-xl pointer-events-none">
            <div className="absolute inset-4 border border-green-400 border-dashed rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-green-400"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-green-400"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-green-400"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-green-400"></div>
            </div>
          </div>

          {/* Highlight successful detection */}
          {highlightBox && (
            <div
              style={{
                position: "absolute",
                border: "3px solid #10b981",
                borderRadius: "8px",
                left: highlightBox.x,
                top: highlightBox.y,
                width: highlightBox.width,
                height: highlightBox.height,
                pointerEvents: "none",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
                animation: "pulse 1s ease-in-out"
              }}
            />
          )}
          
          {/* Scanning indicator */}
          {isScanning && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                กำลังสแกน...
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-[400px] w-full">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={requestCameraPermission}
            className="mt-2 text-red-600 text-sm underline hover:no-underline"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center text-gray-600 text-sm max-w-[400px]">
        <p>วางโค้ดหรือบาร์โค้ดในกรอบเพื่อสแกน</p>
        <p className="text-xs mt-1">รองรับ: QR Code, Barcode, Data Matrix และอื่นๆ</p>
      </div>
    </div>
  );
}