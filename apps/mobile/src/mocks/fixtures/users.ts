import type { Me } from '@nexa/api-contract';

import { meBuyer, meSeller } from './me';

/** Returning users you can sign in as in mock mode (any other number creates a new user). */
export const fixtureUsers: Me[] = [meSeller, meBuyer];

/** Usernames that belong to other (fixture) accounts. */
export const takenUsernames = ['adaeze', 'chidi', 'tunde', 'ngozi', 'kolacreates', 'beatsbytobi'];

/** Usernames nobody can register. The real list lives on the server. */
export const reservedUsernames = [
  'admin',
  'administrator',
  'nexa',
  'nexahub',
  'support',
  'help',
  'root',
  'api',
  'staff',
  'official',
  'payments',
  'payouts',
  'security',
  'moderator',
  'system',
];

/** Same code every time in mock mode. */
export const MOCK_OTP_CODE = '123456';
