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
      position: 'bottom-right',
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: Infinity,
      position: 'bottom-right',
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 8000,
      position: 'bottom-right',
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 5000,
      position: 'bottom-right',
    });
  },

  // /**
  //  * Critical alerts for system-wide issues that interrupt workflow.
  //  * Positioned at top-center to ensure immediate visibility.
  //  */
  // critical: (message: string, description?: string) => {
  //   toast.error(message, {
  //     description,
  //     duration: Infinity, // Stay until dismissed
  //     position: 'top-center', // Break from the bottom-right pattern
  //   });
  // },

  loading: (message: string) => {
    return toast.loading(message);
  },

  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },
};
