import { createApiClient, type ApiError } from '@nexa/api-contract';

import { memoryPersistence } from '../auth/persistence';
import { MockAuthServer } from '../auth/server';
import { MOCK_OTP_CODE } from '../fixtures';
import { createMockFetch } from '../mock-fetch';

const DEVICE = 'dev_test';

function setup(
  opts: {
    ttlSec?: number;
    flags?: Partial<{ smsDown: boolean; rateLimited: boolean; offline: boolean }>;
  } = {},
) {
  let now = Date.parse('2026-11-28T10:00:00Z');
  const persistence = memoryPersistence();
  const flags = { smsDown: false, rateLimited: false, offline: false, ...opts.flags };
  const server = new MockAuthServer({
    persistence,
    accessTokenTtlSec: opts.ttlSec ?? 900,
    now: () => now,
  });
  const fetch = createMockFetch({ server, getFlags: () => flags });
  const api = createApiClient({ baseUrl: 'https://test.nexahub.ng', fetch });
  return {
    api,
    server,
    persistence,
    flags,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const fail = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: ApiError) => e,
  );

describe('mock auth server', () => {
  describe('OTP request', () => {
    it('masks the destination and sets 5-minute expiry and 60-second resend', async () => {
      const { api } = setup();
      const c = await api.requestOtp({ phone: '+2348091112222', channel: 'sms' });
      expect(c.sentTo).toBe('+234 809 *** 2222');
      expect(Date.parse(c.expiresAt) - Date.parse('2026-11-28T10:00:00Z')).toBe(5 * 60_000);
      expect(Date.parse(c.resendAvailableAt) - Date.parse('2026-11-28T10:00:00Z')).toBe(60_000);
    });

    it('refuses a resend inside 60 seconds, allows it after', async () => {
      const { api, advance } = setup();
      await api.requestOtp({ phone: '+2348091112222', channel: 'sms' });
      advance(30_000);
      const e = await fail(api.requestOtp({ phone: '+2348091112222', channel: 'sms' }));
      expect(e).toMatchObject({ status: 429, code: 'RATE_LIMITED' });
      expect(e?.message).toMatch(/30 seconds/);
      advance(30_000);
      await expect(
        api.requestOtp({ phone: '+2348091112222', channel: 'sms' }),
      ).resolves.toBeTruthy();
    });

    it('rejects numbers that are not Nigerian E.164', async () => {
      const { api } = setup();
      await expect(api.requestOtp({ phone: '08031234567', channel: 'sms' })).rejects.toMatchObject({
        code: 'PHONE_INVALID',
      });
    });

    it('returns SMS_UNAVAILABLE when SMS is down, but WhatsApp and email still work', async () => {
      const { api } = setup({ flags: { smsDown: true } });
      await expect(
        api.requestOtp({ phone: '+2348091112222', channel: 'sms' }),
      ).rejects.toMatchObject({
        status: 503,
        code: 'SMS_UNAVAILABLE',
      });
      await expect(
        api.requestOtp({ phone: '+2348091112222', channel: 'whatsapp' }),
      ).resolves.toMatchObject({
        channel: 'whatsapp',
      });
      await expect(
        api.requestOtp({ email: 'new@example.com', channel: 'email' }),
      ).resolves.toMatchObject({
        sentTo: 'n***@example.com',
      });
    });

    it('fails as a network error when offline', async () => {
      const { api } = setup({ flags: { offline: true } });
      await expect(
        api.requestOtp({ phone: '+2348091112222', channel: 'sms' }),
      ).rejects.toMatchObject({
        status: 0,
        code: 'NETWORK_ERROR',
      });
    });
  });

  describe('OTP verify', () => {
    it('allows 5 wrong attempts, then refuses the 6th (even with the right code)', async () => {
      const { api } = setup();
      const { challengeId } = await api.requestOtp({ phone: '+2348091112222', channel: 'sms' });
      const messages: string[] = [];
      for (let i = 0; i < 5; i++) {
        const e = await fail(api.verifyOtp({ challengeId, code: '000000', deviceId: DEVICE }));
        expect(e?.code).toBe('OTP_INVALID');
        messages.push(e!.message);
      }
      expect(messages[0]).toMatch(/4 attempts left/);
      expect(messages[3]).toMatch(/1 attempt left/);
      expect(messages[4]).toMatch(/No attempts left/);
      await expect(
        api.verifyOtp({ challengeId, code: MOCK_OTP_CODE, deviceId: DEVICE }),
      ).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    });

    it('expires codes after 5 minutes', async () => {
      const { api, advance } = setup();
      const { challengeId } = await api.requestOtp({ phone: '+2348091112222', channel: 'sms' });
      advance(5 * 60_000 + 1);
      await expect(
        api.verifyOtp({ challengeId, code: MOCK_OTP_CODE, deviceId: DEVICE }),
      ).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
    });

    it('creates a new buyer for an unknown number', async () => {
      const { api } = setup();
      const { challengeId } = await api.requestOtp({ phone: '+2348091112222', channel: 'sms' });
      const s = await api.verifyOtp({ challengeId, code: MOCK_OTP_CODE, deviceId: DEVICE });
      expect(s.isNewUser).toBe(true);
      expect(s.user).toMatchObject({ phone: '+2348091112222', username: null, roles: ['buyer'] });
    });

    it('signs in a returning user', async () => {
      const { api } = setup();
      const { challengeId } = await api.requestOtp({ phone: '+2348031234567', channel: 'sms' });
      const s = await api.verifyOtp({ challengeId, code: MOCK_OTP_CODE, deviceId: DEVICE });
      expect(s.isNewUser).toBe(false);
      expect(s.user.username).toBe('adaeze');
    });
  });

  describe('tokens', () => {
    async function signIn(ctx: ReturnType<typeof setup>) {
      const { challengeId } = await ctx.api.requestOtp({ phone: '+2348091112222', channel: 'sms' });
      return ctx.api.verifyOtp({ challengeId, code: MOCK_OTP_CODE, deviceId: DEVICE });
    }

    it('expires access tokens after the configured TTL', async () => {
      const ctx = setup({ ttlSec: 30 });
      const s = await signIn(ctx);
      const authed = createApiClient({
        baseUrl: 'https://test.nexahub.ng',
        fetch: createMockFetch({ server: ctx.server }),
        auth: {
          getAccessToken: () => s.accessToken,
          refresh: async () => null,
          onSessionEnded: () => {},
        },
      });
      await expect(authed.getMe()).resolves.toMatchObject({ phone: '+2348091112222' });
      ctx.advance(31_000);
      await expect(authed.getMe()).rejects.toMatchObject({
        status: 401,
        code: 'ACCESS_TOKEN_EXPIRED',
      });
    });

    it('rotates refresh tokens and revokes everything when an old one is reused', async () => {
      const ctx = setup();
      const s = await signIn(ctx);
      const next = await ctx.api.refreshSession({ refreshToken: s.refreshToken, deviceId: DEVICE });
      expect(next.refreshToken).not.toBe(s.refreshToken);
      // Reusing the first token is treated as theft...
      await expect(
        ctx.api.refreshSession({ refreshToken: s.refreshToken, deviceId: DEVICE }),
      ).rejects.toMatchObject({ status: 401, code: 'REFRESH_TOKEN_INVALID' });
      // ...which also kills the newer token.
      await expect(
        ctx.api.refreshSession({ refreshToken: next.refreshToken, deviceId: DEVICE }),
      ).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' });
    });

    it('binds refresh tokens to the device', async () => {
      const ctx = setup();
      const s = await signIn(ctx);
      await expect(
        ctx.api.refreshSession({ refreshToken: s.refreshToken, deviceId: 'other' }),
      ).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' });
    });

    it('remembers users and sessions across a restart (persistence)', async () => {
      const ctx = setup();
      const s = await signIn(ctx);
      const restarted = new MockAuthServer({
        persistence: ctx.persistence,
        accessTokenTtlSec: 900,
      });
      const api = createApiClient({
        baseUrl: 'https://test.nexahub.ng',
        fetch: createMockFetch({ server: restarted }),
      });
      await expect(
        api.refreshSession({ refreshToken: s.refreshToken, deviceId: DEVICE }),
      ).resolves.toHaveProperty('accessToken');
    });
  });
});
