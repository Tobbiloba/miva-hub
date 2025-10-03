import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = (options: ToastOptions | string) => {
    if (typeof options === "string") {
      sonnerToast(options);
      return;
    }

    const { title, description, variant } = options;
    
    if (variant === "destructive") {
      sonnerToast.error(title || "Error", {
        description,
      });
    } else {
      sonnerToast(title || "Notification", {
        description,
      });
    }
  };

  return { toast };
}