import type { OtpChallenge } from '@nexa/api-contract';
import { create } from 'zustand';

export type Destination = { kind: 'phone'; phone: string } | { kind: 'email'; email: string };

/** Short-lived state shared by the phone/email and code screens. Not persisted. */
type SignInState = {
  intent: 'signup' | 'signin';
  destination: Destination | null;
  challenge: OtpChallenge | null;
  /** Set when SMS is down, so the code screen leads with WhatsApp/email. */
  smsUnavailable: boolean;
  setIntent: (intent: 'signup' | 'signin') => void;
  setChallenge: (destination: Destination, challenge: OtpChallenge) => void;
  setSmsUnavailable: (value: boolean) => void;
  reset: () => void;
};

export const useSignInStore = create<SignInState>((set) => ({
  intent: 'signup',
  destination: null,
  challenge: null,
  smsUnavailable: false,
  setIntent: (intent) => set({ intent }),
  setChallenge: (destination, challenge) => set({ destination, challenge }),
  setSmsUnavailable: (smsUnavailable) => set({ smsUnavailable }),
  reset: () => set({ destination: null, challenge: null, smsUnavailable: false }),
}));
