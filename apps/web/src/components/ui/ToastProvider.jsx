import { createContext, useContext, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";

const ToastContext = createContext(null);

function resolveToast(type, message) {
  if (type === "success") {
    return toast.success(message, { className: "toast-success" });
  }
  if (type === "error") {
    return toast.error(message, { className: "toast-error" });
  }
  return toast(message, { className: "toast-info" });
}

export function ToastProvider({ children }) {
  const value = useMemo(
    () => ({
      pushToast: (message, type = "info") => resolveToast(type, message),
      removeToast: (id) => toast.dismiss(id),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        gutter={12}
        toastOptions={{
          duration: 3600,
          className: "toast-item",
          style: {
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
          },
        }}
      />
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