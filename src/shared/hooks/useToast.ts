import { useUiStore } from '../../store/uiStore';
import type { ToastType } from '../../types';

export function useToast() {
  const { pushToast } = useUiStore();

  return {
    success: (message: string) => pushToast(message, 'success'),
    error: (message: string) => pushToast(message, 'error'),
    warning: (message: string) => pushToast(message, 'warning'),
    info: (message: string) => pushToast(message, 'info'),
    show: (message: string, type: ToastType = 'info') => pushToast(message, type),
  };
}
