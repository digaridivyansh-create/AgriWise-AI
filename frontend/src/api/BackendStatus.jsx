import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { checkBackendHealth } from "./health";

export default function BackendStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    async function checkConnection() {
      try {
        const data = await checkBackendHealth();
        if (active) {
          setStatus(data.status === "healthy" ? "connected" : "offline");
        }
      } catch {
        if (active) setStatus("offline");
      }
    }

    checkConnection();
    const interval = window.setInterval(checkConnection, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const styles = {
    checking: "bg-amber-50 text-amber-700 border-amber-200",
    connected: "bg-green-50 text-green-700 border-green-200",
    offline: "bg-red-50 text-red-700 border-red-200",
  };

  const labels = {
    checking: "Checking API",
    connected: "Backend connected",
    offline: "Backend unavailable",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      title="Django backend connection"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${styles[status]}`}
    >
      {status === "checking" ? (
        <LoaderCircle size={14} className="animate-spin" />
      ) : status === "connected" ? (
        <CheckCircle2 size={14} />
      ) : (
        <CircleAlert size={14} />
      )}
      {labels[status]}
    </div>
  );
}
