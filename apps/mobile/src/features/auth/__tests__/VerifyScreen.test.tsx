import { act, fireEvent, screen } from '@testing-library/react-native';

import { mockServer, publicApi } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useSignInStore } from '@/stores/sign-in-store';
import { renderWithProviders } from '@/test/render';
import { resetAppState } from '@/test/session-helpers';

import { VerifyScreen } from '../VerifyScreen';

jest.mock('@/lib/config', () => require('@/test/mock-config'));
jest.mock('expo-router', () => require('@/test/mock-router'));

const PHONE = '+2348091112222';

async function startChallenge() {
  const challenge = await publicApi.requestOtp({ phone: PHONE, channel: 'sms' });
  useSignInStore.getState().setChallenge({ kind: 'phone', phone: PHONE }, challenge);
  return challenge;
}

async function typeCode(code: string) {
  await fireEvent.changeText(screen.getByTestId('otp-input'), code);
}

describe('VerifyScreen', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
    useSignInStore.getState().reset();
  });

  it('shows how many attempts are left after a wrong code and clears the boxes', async () => {
    await startChallenge();
    await renderWithProviders(<VerifyScreen />);

    await typeCode('000000');

    expect(await screen.findByText('That code is not right. 4 attempts left.')).toBeOnTheScreen();
    expect(screen.getByTestId('otp-input')).toHaveDisplayValue('');
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('refuses the 6th attempt with a locked message, even with the right code', async () => {
    await startChallenge();
    await renderWithProviders(<VerifyScreen />);

    for (let i = 1; i <= 5; i++) {
      await typeCode('000000');
      await screen.findByTestId('otp-notice');
    }
    expect(screen.getByText(/No attempts left/)).toBeOnTheScreen();

    await typeCode('123456'); // correct, but too late
    expect(
      await screen.findByText('Too many wrong attempts. Get a new code to try again.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('otp-input')).toBeDisabled();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('signs in with the right code', async () => {
    await startChallenge();
    await renderWithProviders(<VerifyScreen />);
    await typeCode('123456');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', onboarding: true });
  });

  describe('resend countdown', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: Date.parse('2026-11-28T10:00:00Z') });
    });
    afterEach(() => jest.useRealTimers());

    it('counts down from 1:00 and then offers Resend', async () => {
      useSignInStore.getState().setChallenge(
        { kind: 'phone', phone: PHONE },
        {
          challengeId: 'otp_test',
          channel: 'sms',
          sentTo: '+234 809 *** 2222',
          expiresAt: '2026-11-28T10:05:00Z',
          resendAvailableAt: '2026-11-28T10:01:00Z',
        },
      );
      await renderWithProviders(<VerifyScreen />);

      expect(screen.getByTestId('otp-countdown')).toHaveTextContent('Resend code in 1:00');
      expect(screen.queryByTestId('otp-resend')).not.toBeOnTheScreen();
      expect(screen.getByTestId('otp-send-whatsapp')).toBeDisabled();

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(screen.getByTestId('otp-countdown')).toHaveTextContent('Resend code in 0:30');

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(screen.queryByTestId('otp-countdown')).not.toBeOnTheScreen();
      expect(screen.getByTestId('otp-resend')).toBeEnabled();
      expect(screen.getByTestId('otp-send-whatsapp')).toBeEnabled();
    });
  });
});
