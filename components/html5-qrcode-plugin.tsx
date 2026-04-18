"use client";

import { useEffect, useRef, useCallback } from "react";
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
  const successCbRef = useRef(props.qrCodeSuccessCallback);
  const errorCbRef = useRef(props.qrCodeErrorCallback);

  // Keep refs up to date without re-triggering the effect
  useEffect(() => { successCbRef.current = props.qrCodeSuccessCallback; }, [props.qrCodeSuccessCallback]);
  useEffect(() => { errorCbRef.current = props.qrCodeErrorCallback; }, [props.qrCodeErrorCallback]);

  const {
    fps = 10,
    qrbox = { width: 250, height: 250 },
    aspectRatio = 1,
    disableFlip = false,
  } = props;

  useEffect(() => {
    const config = {
      fps,
      qrbox: typeof qrbox === "number" ? qrbox : { width: qrbox.width, height: qrbox.height },
      aspectRatio,
      disableFlip,
    };

    const verbose = false;
    scannerRef.current = new Html5QrcodeScanner("qr-reader", config, verbose);

    scannerRef.current.render(
      (decodedText: string, decodedResult: Html5QrcodeResult) => {
        successCbRef.current(decodedText, decodedResult);
      },
      (errorMessage: string) => {
        if (errorCbRef.current) {
          errorCbRef.current(errorMessage);
        }
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fps, aspectRatio, disableFlip]);

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
