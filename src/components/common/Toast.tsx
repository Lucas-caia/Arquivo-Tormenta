import { useEffect } from "react";
import { X } from "lucide-react";

export type ToastMessage = {
  text: string;
  type: "ok" | "error" | "info";
  details?: string[];
};

export function Toast({ message, onClose }: { message: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, message.type === "error" ? 8000 : 5000);
    return () => window.clearTimeout(id);
  }, [message.type, onClose]);

  return (
    <div className={`toast ${message.type}`} role={message.type === "error" ? "alert" : "status"} aria-live="polite">
      <div>
        <strong>{message.text}</strong>
        {message.details?.length ? (
          <ul>{message.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
        ) : null}
      </div>
      <button onClick={onClose} aria-label="Fechar mensagem"><X size={14} aria-hidden="true" /></button>
    </div>
  );
}
