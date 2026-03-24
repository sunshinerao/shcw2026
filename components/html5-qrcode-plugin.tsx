"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeResult } from "html5-qrcode";

interface Html5QrcodePluginProps {
  fps?: number;
  qrbox?: { width: number; height: number } | number;
  aspectRatio?: number;
  disableFlip?: boolean;
  qrCodeSuccessCallback: (decodedText: string, decodedResult: Html5QrcodeResult) => void;
  qrCodeErrorCallback?: (errorMessage: string) => void;
}

export default function Html5QrcodePlugin(props: Html5QrcodePluginProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const {
    fps = 10,
    qrbox = { width: 250, height: 250 },
    aspectRatio = 1,
    disableFlip = false,
    qrCodeSuccessCallback,
    qrCodeErrorCallback,
  } = props;

  useEffect(() => {
    const config = {
      fps,
      qrbox,
      aspectRatio,
      disableFlip,
    };

    const verbose = false;
    scannerRef.current = new Html5QrcodeScanner("qr-reader", config, verbose);

    scannerRef.current.render(
      (decodedText: string, decodedResult: Html5QrcodeResult) => {
        qrCodeSuccessCallback(decodedText, decodedResult);
      },
      (errorMessage: string) => {
        if (qrCodeErrorCallback) {
          qrCodeErrorCallback(errorMessage);
        }
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [aspectRatio, disableFlip, fps, qrCodeErrorCallback, qrCodeSuccessCallback, qrbox]);

  return (
    <div 
      id="qr-reader" 
      className="w-full"
      style={{ 
        minHeight: "400px",
        borderRadius: "0.75rem",
        overflow: "hidden"
      }}
    />
  );
}
