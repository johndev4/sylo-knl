import { toast } from 'sonner';

/**
 * Global toast utility to ensure consistent notification patterns
 * across the application.
 */
export const appToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 5000,
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: Infinity,
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 8000,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 5000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },
};
