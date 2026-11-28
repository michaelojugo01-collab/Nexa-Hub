import { create } from 'zustand';

/**
 * Where to send the user after they sign in from a public page (e.g. tapping Follow on a
 * store while signed out). In memory only.
 */
type ReturnToState = {
  path: string | null;
  set: (path: string | null) => void;
};

export const useReturnTo = create<ReturnToState>((set) => ({
  path: null,
  set: (path) => set({ path }),
}));
