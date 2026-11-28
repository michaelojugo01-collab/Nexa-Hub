import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Input } from '@/components';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { phoneSchema } from '@/lib/schemas';
import { useSignInStore } from '@/stores/sign-in-store';

import { AuthHeader } from './AuthHeader';
import { AuthScreen } from './AuthScreen';
import { InlineNotice } from './InlineNotice';
import { useRequestOtp } from './use-request-otp';

const formSchema = z.object({ phone: phoneSchema });

export function PhoneScreen() {
  const intent = useSignInStore((s) => s.intent);
  const smsUnavailable = useSignInStore((s) => s.smsUnavailable);
  const setSmsUnavailable = useSignInStore((s) => s.setSmsUnavailable);
  const request = useRequestOtp();
  const { control, handleSubmit, formState } = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: '' },
    mode: 'onTouched',
  });

  const send = (phone: string, channel: 'sms' | 'whatsapp') =>
    request.mutate(
      { destination: { kind: 'phone', phone }, channel },
      {
        onSuccess: () => {
          setSmsUnavailable(false);
          router.push('/verify');
        },
        onError: (error) => {
          if (errorCode(error) === 'SMS_UNAVAILABLE') setSmsUnavailable(true);
        },
      },
    );

  const onSubmit = handleSubmit(({ phone }) => send(phone, 'sms'));
  const code = errorCode(request.error);

  return (
    <AuthScreen
      testID="phone-screen"
      footer={
        <>
          <Button
            label="Send code"
            onPress={onSubmit}
            loading={request.isPending && request.variables?.channel === 'sms'}
            disabled={request.isPending}
            testID="phone-submit"
          />
          <Button
            label="Use email instead"
            variant="ghost"
            onPress={() => router.push('/email-sign-in')}
            testID="phone-use-email"
          />
        </>
      }>
      <AuthHeader
        title={intent === 'signin' ? 'Welcome back' : 'What’s your number?'}
        subtitle="We’ll text you a 6-digit code to confirm it’s you."
      />
      <View className="gap-4">
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              label="Phone number"
              prefix="+234"
              placeholder="803 123 4567"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => onSubmit()}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.phone?.message}
              testID="phone-input"
            />
          )}
        />

        {smsUnavailable ? (
          <InlineNotice
            tone="warning"
            message="We can’t send SMS right now. Get your code on WhatsApp or by email instead."
            testID="phone-sms-down">
            <View className="flex-row flex-wrap gap-2">
              <Button
                label="Send via WhatsApp"
                size="sm"
                loading={request.isPending && request.variables?.channel === 'whatsapp'}
                onPress={handleSubmit(({ phone }) => send(phone, 'whatsapp'))}
                testID="phone-send-whatsapp"
              />
              <Button
                label="Use email instead"
                size="sm"
                variant="secondary"
                onPress={() => router.push('/email-sign-in')}
              />
            </View>
          </InlineNotice>
        ) : null}
        {request.isError && code !== 'SMS_UNAVAILABLE' ? (
          <InlineNotice
            tone="error"
            testID="phone-error"
            message={
              isOfflineError(request.error)
                ? 'You’re offline. Check your connection and try again.'
                : errorMessage(request.error)
            }
          />
        ) : null}
      </View>
    </AuthScreen>
  );
}
