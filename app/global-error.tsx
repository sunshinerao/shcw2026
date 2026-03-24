"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: "28rem", width: "100%", textAlign: "center" }}>
            <div style={{ width: "4rem", height: "4rem", backgroundColor: "#fee2e2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
              <AlertTriangle style={{ width: "2rem", height: "2rem", color: "#dc2626" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0f172a", marginBottom: "0.5rem" }}>出错了 / Something went wrong</h2>
            <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>页面发生错误，请刷新重试。/ An error occurred. Please try refreshing.</p>
            <button
              onClick={reset}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.5rem", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontSize: "1rem" }}
            >
              <RefreshCw style={{ width: "1rem", height: "1rem" }} />
              重试 / Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
