import type { Me } from '@nexa/api-contract';

import { stores, toSummary } from './stores';

export const meBuyer: Me = {
  id: 'usr_chidi',
  username: 'chidi',
  displayName: 'Chidi Nwosu',
  avatarUrl: null,
  roles: ['buyer'],
  store: null,
  createdAt: '2026-11-10T08:00:00Z',
};

export const meSeller: Me = {
  id: 'usr_adaeze',
  username: 'adaeze',
  displayName: 'Adaeze Okafor',
  avatarUrl: stores[0]!.avatarUrl,
  roles: ['buyer', 'seller'],
  store: toSummary(stores[0]!),
  createdAt: '2026-10-02T09:15:00Z',
};
