import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const ToastContext = createContext(null);

function toastStyles(type) {
  if (type === "error") {
    return "toast-item toast-error";
  }
  if (type === "success") {
    return "toast-item toast-success";
  }
  return "toast-item";
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message, type = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => removeToast(id), 3500);
      return id;
    },
    [removeToast],
  );

  const value = useMemo(
    () => ({ pushToast, removeToast }),
    [pushToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(380px,92vw)] flex-col gap-2.5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 transition ${toastStyles(toast.type)}`}
            data-type={toast.type}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-6">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-md px-2 py-1 text-xs font-semibold opacity-70 transition hover:opacity-100"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
