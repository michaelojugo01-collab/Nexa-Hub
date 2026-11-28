import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'error';

export type ToastMessage = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastState = {
  current: ToastMessage | null;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (message, variant = 'info') => set({ current: { id: nextId++, message, variant } }),
  hide: () => set({ current: null }),
}));

/** Call from anywhere (including outside React): toast.show('Saved', 'success'). */
export const toast = {
  show: (message: string, variant?: ToastVariant) =>
    useToastStore.getState().show(message, variant),
  hide: () => useToastStore.getState().hide(),
};
