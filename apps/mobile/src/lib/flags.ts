import { create } from 'zustand';

/**
 * Feature flags. Today they come from this local config (plus Dev settings overrides);
 * later `readFlag` can read PostHog instead without changing any screen.
 */
export const defaultFlags = {
  /** Store page Services tab (services are a later release module). */
  servicesTab: false,
} as const satisfies Record<string, boolean>;

export type FlagKey = keyof typeof defaultFlags;

type FlagOverrides = {
  overrides: Partial<Record<FlagKey, boolean>>;
  setOverride: (key: FlagKey, value: boolean | undefined) => void;
};

/** Dev-only overrides (Dev settings screen). Not persisted. */
export const useFlagOverrides = create<FlagOverrides>((set) => ({
  overrides: {},
  setOverride: (key, value) =>
    set((s) => {
      const overrides = { ...s.overrides };
      if (value === undefined) delete overrides[key];
      else overrides[key] = value;
      return { overrides };
    }),
}));

/** The value of a flag outside React. */
export function readFlag(key: FlagKey): boolean {
  return useFlagOverrides.getState().overrides[key] ?? defaultFlags[key];
}

/** The value of a flag. Re-renders when an override changes. */
export function useFeatureFlag(key: FlagKey): boolean {
  const override = useFlagOverrides((s) => s.overrides[key]);
  return override ?? defaultFlags[key];
}
