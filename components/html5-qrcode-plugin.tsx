"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface Html5QrcodePluginProps {
  fps?: number;
  qrbox?: number;
  disableFlip?: boolean;
  qrCodeSuccessCallback: (decodedText: string) => void;
}

export default function Html5QrcodePlugin(props: Html5QrcodePluginProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const successCbRef = useRef(props.qrCodeSuccessCallback);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { successCbRef.current = props.qrCodeSuccessCallback; }, [props.qrCodeSuccessCallback]);

  const { fps = 10, disableFlip = false } = props;

  useEffect(() => {
    let cancelled = false;
    const elementId = "qr-reader";
    const html5Qrcode = new Html5Qrcode(elementId);
    scannerRef.current = html5Qrcode;

    // Compute responsive qrbox based on container width
    const computeQrbox = () => {
      const container = containerRef.current;
      if (!container) return 250;
      const w = container.clientWidth;
      return Math.min(250, Math.floor(w * 0.7));
    };

    const startCamera = async () => {
      try {
        // Prefer rear camera on mobile
        await html5Qrcode.start(
          { facingMode: "environment" },
          { fps, qrbox: computeQrbox(), disableFlip },
          (decodedText) => { successCbRef.current(decodedText); },
          () => {} // ignore per-frame scan errors
        );
      } catch {
        // Rear camera failed — try any available camera
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cancelled || cameras.length === 0) {
            if (!cancelled) setError("未检测到摄像头");
            return;
          }
          await html5Qrcode.start(
            cameras[0].id,
            { fps, qrbox: computeQrbox(), disableFlip },
            (decodedText) => { successCbRef.current(decodedText); },
            () => {}
          );
        } catch (e: unknown) {
          if (!cancelled) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg.includes("Permission") ? "请允许使用摄像头权限" : `摄像头启动失败: ${msg}`);
          }
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      html5Qrcode.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fps, disableFlip]);

  if (error) {
    return (
      <div
        ref={containerRef}
        className="w-full flex flex-col items-center justify-center bg-slate-900 text-white rounded-xl"
        style={{ minHeight: "300px" }}
      >
        <p className="text-sm mb-3">{error}</p>
        <button
          className="px-4 py-2 bg-emerald-600 rounded-lg text-sm font-medium"
          onClick={() => { setError(null); }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <div
        id="qr-reader"
        className="w-full"
        style={{ minHeight: "300px", borderRadius: "0.75rem", overflow: "hidden" }}
      />
    </div>
  );
}
