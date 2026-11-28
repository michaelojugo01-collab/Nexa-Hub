import type { OtpChannel, OtpRequest } from '@nexa/api-contract';
import { useMutation } from '@tanstack/react-query';

import { publicApi } from '@/lib/api/client';
import { useSignInStore, type Destination } from '@/stores/sign-in-store';

export function toOtpRequest(destination: Destination, channel: OtpChannel): OtpRequest {
  return destination.kind === 'phone'
    ? { phone: destination.phone, channel: channel === 'whatsapp' ? 'whatsapp' : 'sms' }
    : { email: destination.email, channel: 'email' };
}

/** Sends a code and stores the challenge for the code screen. */
export function useRequestOtp() {
  const setChallenge = useSignInStore((s) => s.setChallenge);
  return useMutation({
    mutationFn: async ({
      destination,
      channel,
    }: {
      destination: Destination;
      channel: OtpChannel;
    }) => {
      const challenge = await publicApi.requestOtp(toOtpRequest(destination, channel));
      return { destination, challenge };
    },
    onSuccess: ({ destination, challenge }) => setChallenge(destination, challenge),
  });
}
