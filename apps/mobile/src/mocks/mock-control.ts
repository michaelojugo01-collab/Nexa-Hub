import { create } from 'zustand';

/** Dev-only switches that make the mock API fail on purpose (Dev settings screen). */
type MockControlState = {
  /** SMS channel down: OTP requests with channel "sms" return SMS_UNAVAILABLE. */
  smsDown: boolean;
  /** OTP request/verify return RATE_LIMITED. */
  rateLimited: boolean;
  /** Every mocked request fails as if there were no network. */
  offline: boolean;
  /** Every simulated store image upload fails (otherwise about 1 in 6 do). */
  uploadsFail: boolean;
  /** Every product upload part fails as if the network dropped. */
  networkDrops: boolean;
  /** Every finished product file fails the mock virus scan. */
  filesRejected: boolean;
  set: (patch: Partial<Omit<MockControlState, 'set'>>) => void;
};

export const useMockControl = create<MockControlState>((set) => ({
  smsDown: false,
  rateLimited: false,
  offline: false,
  uploadsFail: false,
  networkDrops: false,
  filesRejected: false,
  set: (patch) => set(patch),
}));
