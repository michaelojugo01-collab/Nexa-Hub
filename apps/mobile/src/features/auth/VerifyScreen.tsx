import type { OtpChannel } from '@nexa/api-contract';
import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components';
import { publicApi } from '@/lib/api/client';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { secureStorage } from '@/lib/auth/secure-storage';
import { startSession } from '@/lib/auth/session';
import { formatSeconds, useCountdown } from '@/lib/use-countdown';
import { useSignInStore } from '@/stores/sign-in-store';

import { AuthHeader } from './AuthHeader';
import { AuthScreen } from './AuthScreen';
import { InlineNotice } from './InlineNotice';
import { OTP_LENGTH, OtpInput } from './OtpInput';
import { useRequestOtp } from './use-request-otp';
import { useSmsCode } from './use-sms-code';

const channelLabel: Record<OtpChannel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'email',
};

export function VerifyScreen() {
  const destination = useSignInStore((s) => s.destination);
  const challenge = useSignInStore((s) => s.challenge);
  if (!challenge || !destination) return <Redirect href="/phone" />;
  // A new challenge (resend / channel switch) remounts the form with a clean state.
  return <VerifyForm key={challenge.challengeId} />;
}

function VerifyForm() {
  const destination = useSignInStore((s) => s.destination)!;
  const challenge = useSignInStore((s) => s.challenge)!;
  const smsUnavailable = useSignInStore((s) => s.smsUnavailable);
  const resetFlow = useSignInStore((s) => s.reset);
  const [code, setCode] = useState('');
  const [locked, setLocked] = useState(false);
  const resend = useRequestOtp();
  const secondsLeft = useCountdown(challenge?.resendAvailableAt);

  const verify = useMutation({
    mutationFn: async (value: string) =>
      publicApi.verifyOtp({
        challengeId: challenge.challengeId,
        code: value,
        deviceId: await secureStorage.getDeviceId(),
      }),
    onSuccess: async (session) => {
      resetFlow();
      await startSession(session); // route guards move to onboarding or Home
    },
    onError: (error) => {
      if (errorCode(error) === 'OTP_LOCKED') setLocked(true);
      setCode('');
    },
  });

  const submit = (value: string) => {
    if (value.length === OTP_LENGTH && !verify.isPending && !locked) verify.mutate(value);
  };

  // Android SMS Retriever (development builds only) fills the code automatically.
  useSmsCode((smsCode) => {
    setCode(smsCode);
    submit(smsCode);
  });

  const sendAgain = (channel: OtpChannel) => resend.mutate({ destination, channel });
  const canResend = secondsLeft === 0 && !resend.isPending;
  const verifyCode = errorCode(verify.error);

  let notice: { tone: 'error' | 'warning'; message: string } | null = null;
  if (locked) {
    notice = { tone: 'error', message: 'Too many wrong attempts. Get a new code to try again.' };
  } else if (verify.isError) {
    notice = {
      tone: verifyCode === 'OTP_EXPIRED' ? 'warning' : 'error',
      message: isOfflineError(verify.error)
        ? 'You’re offline. Check your connection, then enter the code again.'
        : errorMessage(verify.error),
    };
  } else if (resend.isError) {
    notice = {
      tone: 'error',
      message: isOfflineError(resend.error)
        ? 'You’re offline. Check your connection and try again.'
        : errorMessage(resend.error),
    };
  }

  const otherPhoneChannel: OtpChannel | null =
    destination.kind !== 'phone'
      ? null
      : challenge.channel === 'whatsapp'
        ? smsUnavailable
          ? null
          : 'sms'
        : 'whatsapp';

  return (
    <AuthScreen testID="verify-screen">
      <AuthHeader
        title="Enter your code"
        subtitle={`We sent a 6-digit code to ${challenge.sentTo} by ${channelLabel[challenge.channel]}.`}
      />
      <View className="gap-4">
        <OtpInput
          value={code}
          onChange={(value) => {
            setCode(value);
            if (verify.isError && !locked) verify.reset();
            submit(value);
          }}
          disabled={locked || verify.isPending}
          error={!!notice && notice.tone === 'error'}
          testID="otp-input"
        />

        {verify.isPending ? (
          <Text className="text-sm text-text-muted" testID="otp-verifying">
            Checking your code…
          </Text>
        ) : null}

        {notice ? (
          <InlineNotice tone={notice.tone} message={notice.message} testID="otp-notice" />
        ) : null}

        <View className="gap-2 pt-2">
          {canResend ? (
            <Button
              label={locked || verifyCode === 'OTP_EXPIRED' ? 'Get a new code' : 'Resend code'}
              variant={locked || verifyCode === 'OTP_EXPIRED' ? 'primary' : 'secondary'}
              onPress={() => sendAgain(challenge.channel)}
              testID="otp-resend"
            />
          ) : (
            <Text className="text-center text-sm text-text-muted" testID="otp-countdown">
              {resend.isPending ? 'Sending…' : `Resend code in ${formatSeconds(secondsLeft)}`}
            </Text>
          )}

          {otherPhoneChannel ? (
            <Button
              label={`Send via ${channelLabel[otherPhoneChannel]}`}
              variant="ghost"
              disabled={!canResend}
              onPress={() => sendAgain(otherPhoneChannel)}
              testID={`otp-send-${otherPhoneChannel}`}
            />
          ) : null}
          {destination.kind === 'phone' ? (
            <Button
              label="Send via email instead"
              variant="ghost"
              onPress={() => router.replace('/email-sign-in')}
              testID="otp-use-email"
            />
          ) : null}
        </View>
      </View>
    </AuthScreen>
  );
}
