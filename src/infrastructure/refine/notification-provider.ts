import type { NotificationProvider } from "@refinedev/core";
import { toast } from "sonner";

export const notificationProvider: NotificationProvider = {
  open: ({ key, message, description, type }) => {
    const id = key ?? undefined;
    if (type === "success") toast.success(message, { id, description });
    if (type === "error") toast.error(message, { id, description });
    if (type === "progress") toast.loading(message, { id, description });
  },
  close: (key) => toast.dismiss(key),
};
