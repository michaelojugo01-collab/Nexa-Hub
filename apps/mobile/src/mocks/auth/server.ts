import type {
  ApiErrorBody,
  AuthSession,
  DataExport,
  Me,
  MeUpdate,
  OtpChallenge,
  OtpChannel,
  TokenPair,
  UsernameAvailability,
} from '@nexa/api-contract';

import { logger } from '@/lib/logger';

import {
  categories,
  fixtureUsers,
  MOCK_OTP_CODE,
  reservedUsernames,
  takenUsernames,
} from '../fixtures';
import type { MockPersistence } from './persistence';

/**
 * A small in-memory fake of the auth/me backend that follows the spec's rules (F1):
 * 6-digit codes, 5-minute expiry, 60-second resend, 5 attempts then locked, 15-minute access
 * tokens, single-use rotating refresh tokens bound to a device, reuse detection.
 */

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_RESEND_MS = 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const DELETION_GRACE_DAYS = 30;

export type MockResult<T = unknown> = { status: number; body: T | ApiErrorBody | null };

type Challenge = {
  id: string;
  destination: string;
  kind: 'phone' | 'email';
  channel: OtpChannel;
  expiresAt: number;
  resendAvailableAt: number;
  attempts: number;
};

type UserRecord = Me & { deactivatedAt: string | null; deletesAt: string | null };

type RefreshRecord = { userId: string; deviceId: string; used: boolean };

type Db = {
  users: Record<string, UserRecord>;
  refreshTokens: Record<string, RefreshRecord>;
  exports: Record<string, DataExport>;
  seq: number;
};

export type MockServerOptions = {
  persistence: MockPersistence;
  accessTokenTtlSec: number;
  now?: () => number;
  /** Injected so tests can pick ids; default uses Math.random (not security-sensitive: mock). */
  random?: () => string;
};

const err = (status: number, code: string, message: string): MockResult<never> => ({
  status,
  body: { code, message },
});
const ok = <T>(body: T, status = 200): MockResult<T> => ({ status, body });

const PHONE = /^\+234[789][01]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-z][a-z0-9_]{2,19}$/;

export function maskPhone(e164: string) {
  const m = /^\+234(\d{3})\d{3}(\d{4})$/.exec(e164);
  return m ? `+234 ${m[1]} *** ${m[2]}` : e164;
}

export function maskEmail(email: string) {
  const [name = '', domain = ''] = email.split('@');
  return `${name.slice(0, 1)}***@${domain}`;
}

function freshDb(): Db {
  const users: Record<string, UserRecord> = {};
  for (const u of fixtureUsers) users[u.id] = { ...u, deactivatedAt: null, deletesAt: null };
  return { users, refreshTokens: {}, exports: {}, seq: 1 };
}

function publicUser(u: UserRecord): Me {
  const { deactivatedAt: _a, deletesAt: _d, ...me } = u;
  return me;
}

export class MockAuthServer {
  private db: Db = freshDb();
  private challenges = new Map<string, Challenge>();
  private loaded: Promise<void> | null = null;
  private readonly now: () => number;
  private readonly random: () => string;

  constructor(private readonly options: MockServerOptions) {
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? (() => Math.random().toString(36).slice(2, 12));
  }

  private ensureLoaded() {
    this.loaded ??= this.options.persistence
      .load()
      .then((json) => {
        if (!json) return;
        const saved = JSON.parse(json) as Db;
        this.db = { ...freshDb(), ...saved, users: { ...freshDb().users, ...saved.users } };
      })
      .catch(() => {
        this.db = freshDb();
      });
    return this.loaded;
  }

  private async persist() {
    // Keep the payload small (some iOS versions reject keychain values over ~2KB):
    // only users that differ from the fixtures, and only unused refresh tokens.
    const fixtures = freshDb().users;
    const users = Object.fromEntries(
      Object.entries(this.db.users).filter(
        ([id, u]) => JSON.stringify(u) !== JSON.stringify(fixtures[id]),
      ),
    );
    const refreshTokens = Object.fromEntries(
      Object.entries(this.db.refreshTokens)
        .filter(([, r]) => !r.used)
        .slice(-4),
    );
    const exportsByUser = this.db.exports;
    await this.options.persistence
      .save(JSON.stringify({ users, refreshTokens, exports: exportsByUser, seq: this.db.seq }))
      .catch(() => logger.warn('Mock DB could not be saved'));
  }

  private resetListeners: (() => Promise<void>)[] = [];

  /** Other mock services (stores) reset with the auth server. */
  onReset(listener: () => Promise<void>) {
    this.resetListeners.push(listener);
  }

  async reset() {
    this.db = freshDb();
    this.challenges.clear();
    this.loaded = Promise.resolve();
    await this.options.persistence.clear();
    await Promise.all(this.resetListeners.map((l) => l()));
  }

  /** For other mock services: the signed-in user record (mutable), or the 401 to send. */
  resolveUser(authorization: string | undefined) {
    return this.authenticate(authorization);
  }

  /** For other mock services: save after changing a user record from resolveUser. */
  saveUsers() {
    return this.persist();
  }

  private id(prefix: string) {
    return `${prefix}_${(this.db.seq++).toString(36)}${this.random()}`;
  }

  private iso(ms: number) {
    return new Date(ms).toISOString();
  }

  // ── Tokens ────────────────────────────────────────────────────────────────

  private issueTokens(userId: string, deviceId: string): TokenPair {
    const expiresAt = this.now() + this.options.accessTokenTtlSec * 1000;
    const refreshToken = this.id('rt');
    this.db.refreshTokens[refreshToken] = { userId, deviceId, used: false };
    return {
      accessToken: `at.${userId}.${expiresAt}.${this.random()}`,
      accessTokenExpiresAt: this.iso(expiresAt),
      refreshToken,
    };
  }

  /** Resolves the user from an Authorization header, or returns the 401 to send. */
  private async authenticate(authorization: string | undefined) {
    await this.ensureLoaded();
    const token = authorization?.replace(/^Bearer /, '');
    if (!token) return { error: err(401, 'UNAUTHENTICATED', 'Please sign in again.') };
    const [prefix, userId, exp] = token.split('.');
    const user = userId ? this.db.users[userId] : undefined;
    if (prefix !== 'at' || !user || user.deactivatedAt) {
      return { error: err(401, 'UNAUTHENTICATED', 'Please sign in again.') };
    }
    if (Number(exp) <= this.now()) {
      return { error: err(401, 'ACCESS_TOKEN_EXPIRED', 'Your session needs refreshing.') };
    }
    return { user };
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async requestOtp(
    body: { phone?: string; email?: string; channel?: OtpChannel },
    flags: { smsDown: boolean; rateLimited: boolean },
  ): Promise<MockResult<OtpChallenge>> {
    await this.ensureLoaded();
    if (flags.rateLimited) {
      return err(429, 'RATE_LIMITED', 'Too many attempts. Try again in 60 seconds.');
    }
    const kind = body.phone !== undefined ? 'phone' : 'email';
    const destination = (kind === 'phone' ? body.phone : body.email?.toLowerCase()) ?? '';
    const channel = body.channel ?? (kind === 'phone' ? 'sms' : 'email');

    if (kind === 'phone' && !PHONE.test(destination)) {
      return err(400, 'PHONE_INVALID', 'Enter a valid Nigerian mobile number.');
    }
    if (kind === 'email' && !EMAIL.test(destination)) {
      return err(400, 'VALIDATION_ERROR', 'Enter a valid email address.');
    }
    if ((kind === 'email') !== (channel === 'email')) {
      return err(400, 'VALIDATION_ERROR', 'That channel does not match the destination.');
    }
    if (channel === 'sms' && flags.smsDown) {
      return err(
        503,
        'SMS_UNAVAILABLE',
        'We can’t send SMS right now. Get your code on WhatsApp or by email instead.',
      );
    }

    const now = this.now();
    for (const c of this.challenges.values()) {
      if (c.destination === destination && c.resendAvailableAt > now) {
        const wait = Math.ceil((c.resendAvailableAt - now) / 1000);
        return err(
          429,
          'RATE_LIMITED',
          `Please wait ${wait} seconds before requesting another code.`,
        );
      }
    }
    // A new code replaces any older one for the same destination.
    for (const [id, c] of this.challenges)
      if (c.destination === destination) this.challenges.delete(id);

    const challenge: Challenge = {
      id: this.id('otp'),
      destination,
      kind,
      channel,
      expiresAt: now + OTP_TTL_MS,
      resendAvailableAt: now + OTP_RESEND_MS,
      attempts: 0,
    };
    this.challenges.set(challenge.id, challenge);
    logger.sensitive(`OTP for ${destination} via ${channel}: ${MOCK_OTP_CODE}`);

    return ok({
      challengeId: challenge.id,
      channel,
      sentTo: kind === 'phone' ? maskPhone(destination) : maskEmail(destination),
      expiresAt: this.iso(challenge.expiresAt),
      resendAvailableAt: this.iso(challenge.resendAvailableAt),
    });
  }

  async verifyOtp(
    body: { challengeId?: string; code?: string; deviceId?: string },
    flags: { rateLimited: boolean },
  ): Promise<MockResult<AuthSession>> {
    await this.ensureLoaded();
    if (flags.rateLimited) {
      return err(429, 'RATE_LIMITED', 'Too many attempts. Try again in 60 seconds.');
    }
    if (!body.deviceId || !/^\d{6}$/.test(body.code ?? '')) {
      return err(400, 'VALIDATION_ERROR', 'Enter the 6-digit code.');
    }
    const challenge = body.challengeId ? this.challenges.get(body.challengeId) : undefined;
    if (!challenge) return err(400, 'OTP_EXPIRED', 'This code has expired. Request a new one.');

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return err(400, 'OTP_LOCKED', 'Too many wrong attempts. Request a new code to try again.');
    }
    if (this.now() > challenge.expiresAt) {
      return err(400, 'OTP_EXPIRED', 'This code has expired. Request a new one.');
    }
    if (body.code !== MOCK_OTP_CODE) {
      challenge.attempts += 1;
      const left = OTP_MAX_ATTEMPTS - challenge.attempts;
      return err(
        400,
        'OTP_INVALID',
        left > 0
          ? `That code is not right. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`
          : 'That code is not right. No attempts left — request a new code.',
      );
    }

    this.challenges.delete(challenge.id);
    let user = Object.values(this.db.users).find((u) =>
      challenge.kind === 'phone'
        ? u.phone === challenge.destination
        : u.email === challenge.destination,
    );
    const isNewUser = !user;
    if (!user) {
      user = {
        id: this.id('usr'),
        username: null,
        displayName: null,
        avatarUrl: null,
        bio: null,
        phone: challenge.kind === 'phone' ? challenge.destination : null,
        email: challenge.kind === 'email' ? challenge.destination : null,
        emailVerified: challenge.kind === 'email', // proved by receiving the code
        interests: [],
        roles: ['buyer'],
        store: null,
        createdAt: this.iso(this.now()),
        deactivatedAt: null,
        deletesAt: null,
      };
      this.db.users[user.id] = user;
    } else if (user.deactivatedAt) {
      // Signing in during the 30-day grace period cancels deletion.
      user.deactivatedAt = null;
      user.deletesAt = null;
    }

    const tokens = this.issueTokens(user.id, body.deviceId);
    await this.persist();
    return ok({ ...tokens, user: publicUser(user), isNewUser });
  }

  async refresh(body: {
    refreshToken?: string;
    deviceId?: string;
  }): Promise<MockResult<TokenPair>> {
    await this.ensureLoaded();
    const invalid = err(
      401,
      'REFRESH_TOKEN_INVALID',
      'Your session has ended. Please sign in again.',
    );
    const record = body.refreshToken ? this.db.refreshTokens[body.refreshToken] : undefined;
    if (!record || record.deviceId !== body.deviceId) return invalid;
    if (record.used) {
      // Reuse of a rotated token: assume theft, revoke every session for this user.
      for (const r of Object.values(this.db.refreshTokens))
        if (r.userId === record.userId) r.used = true;
      await this.persist();
      return invalid;
    }
    const user = this.db.users[record.userId];
    if (!user || user.deactivatedAt) return invalid;

    record.used = true;
    const tokens = this.issueTokens(record.userId, record.deviceId);
    await this.persist();
    return ok(tokens);
  }

  async logout(body: { refreshToken?: string }): Promise<MockResult> {
    await this.ensureLoaded();
    if (!body.refreshToken) return err(400, 'VALIDATION_ERROR', 'refreshToken is required.');
    const record = this.db.refreshTokens[body.refreshToken];
    if (record) record.used = true;
    await this.persist();
    return { status: 204, body: null };
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  async getMe(authorization?: string): Promise<MockResult<Me>> {
    const { user, error } = await this.authenticate(authorization);
    return error ?? ok(publicUser(user));
  }

  private usernameStatus(username: string, selfId: string): UsernameAvailability['reason'] {
    if (!USERNAME.test(username)) return 'invalid';
    if (reservedUsernames.includes(username)) return 'reserved';
    const owner = Object.values(this.db.users).find((u) => u.username === username);
    if (owner && owner.id !== selfId) return 'taken';
    if (!owner && takenUsernames.includes(username)) return 'taken';
    return null;
  }

  async checkUsername(authorization: string | undefined, username: string) {
    const { user, error } = await this.authenticate(authorization);
    if (error) return error;
    const reason = this.usernameStatus(username.toLowerCase(), user.id);
    return ok<UsernameAvailability>({ username, available: reason === null, reason });
  }

  async updateMe(authorization: string | undefined, patch: MeUpdate): Promise<MockResult<Me>> {
    const { user, error } = await this.authenticate(authorization);
    if (error) return error;
    if (!patch || Object.keys(patch).length === 0) {
      return err(400, 'VALIDATION_ERROR', 'Nothing to update.');
    }
    if (patch.displayName !== undefined && !patch.displayName.trim()) {
      return err(400, 'VALIDATION_ERROR', 'Enter your name.');
    }
    if (patch.bio && patch.bio.length > 160) {
      return err(400, 'VALIDATION_ERROR', 'Bio must be 160 characters or fewer.');
    }
    if (patch.username !== undefined) {
      const reason = this.usernameStatus(patch.username, user.id);
      if (reason === 'invalid') {
        return err(
          400,
          'USERNAME_INVALID',
          'Usernames are 3–20 characters, start with a letter, and use only a–z, 0–9 and _.',
        );
      }
      if (reason === 'reserved')
        return err(409, 'USERNAME_RESERVED', 'That username isn’t available.');
      if (reason === 'taken') return err(409, 'USERNAME_TAKEN', 'That username is taken.');
    }
    if (patch.email !== undefined) {
      const email = patch.email.toLowerCase();
      if (!EMAIL.test(email)) return err(400, 'VALIDATION_ERROR', 'Enter a valid email address.');
      if (Object.values(this.db.users).some((u) => u.email === email && u.id !== user.id)) {
        return err(409, 'EMAIL_TAKEN', 'That email is already linked to another account.');
      }
    }
    if (patch.interests !== undefined) {
      const slugs = new Set(categories.map((c) => c.slug));
      if (patch.interests.length > 3)
        return err(400, 'VALIDATION_ERROR', 'Choose up to 3 interests.');
      if (
        new Set(patch.interests).size !== patch.interests.length ||
        patch.interests.some((i) => !slugs.has(i))
      ) {
        return err(400, 'VALIDATION_ERROR', 'Choose interests from the list.');
      }
    }

    if (patch.displayName !== undefined) user.displayName = patch.displayName.trim();
    if (patch.username !== undefined) user.username = patch.username;
    if (patch.bio !== undefined) user.bio = patch.bio?.trim() || null;
    if (patch.interests !== undefined) user.interests = patch.interests;
    if (patch.email !== undefined && patch.email.toLowerCase() !== user.email) {
      user.email = patch.email.toLowerCase();
      user.emailVerified = false;
      logger.sensitive(`Verification link sent to ${user.email}`);
    }
    await this.persist();
    return ok(publicUser(user));
  }

  async becomeSeller(authorization?: string): Promise<MockResult<Me>> {
    const { user, error } = await this.authenticate(authorization);
    if (error) return error;
    if (!user.roles.includes('seller')) user.roles = [...user.roles, 'seller'];
    await this.persist();
    return ok(publicUser(user));
  }

  async sendEmailVerification(authorization?: string) {
    const { user, error } = await this.authenticate(authorization);
    if (error) return error;
    if (!user.email) return err(400, 'VALIDATION_ERROR', 'Add an email address first.');
    if (user.emailVerified) return err(400, 'VALIDATION_ERROR', 'Your email is already verified.');
    logger.sensitive(`Verification link re-sent to ${user.email}`);
    return ok({ sentTo: maskEmail(user.email) }, 202);
  }

  async deleteMe(authorization: string | undefined, body: { confirmation?: string }) {
    const { user, error } = await this.authenticate(authorization);
    if (error) return error;
    if (body?.confirmation !== 'DELETE') {
      return err(400, 'VALIDATION_ERROR', 'Type DELETE to confirm.');
    }
    const now = this.now();
    user.deactivatedAt = this.iso(now);
    user.deletesAt = this.iso(now + DELETION_GRACE_DAYS * 86_400_000);
    for (const r of Object.values(this.db.refreshTokens)) if (r.userId === user.id) r.used = true;
    await this.persist();
    return ok({ deactivatedAt: user.deactivatedAt, deletesAt: user.deletesAt }, 202);
  }

  async getDataExport(authorization?: string) {
    const { user, error } = await this.authenticate(authorization);
    if (error) return error;
    return ok<DataExport>(this.db.exports[user.id] ?? { status: 'none', requestedAt: null });
  }

  async requestDataExport(authorization?: string) {
    const { user, error } = await this.authenticate(authorization);
    if (error) return error;
    const existing = this.db.exports[user.id];
    if (existing?.status === 'requested') return ok(existing, 202);
    const created: DataExport = { status: 'requested', requestedAt: this.iso(this.now()) };
    this.db.exports[user.id] = created;
    await this.persist();
    return ok(created, 202);
  }
}
