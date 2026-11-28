/**
 * Public profiles of people who have stores but no sign-in fixture account. (Adaeze and
 * Chidi come from the mock auth server, so profile edits show up.)
 */
export type ProfileSeed = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

const avatar = (seed: string) => `https://picsum.photos/seed/nexa-user-${seed}/240/240`;

export const profileFixtures: ProfileSeed[] = [
  {
    id: 'usr_tunde',
    username: 'tunde',
    displayName: 'Tunde Bakare',
    bio: 'Physics teacher. I help students pass JAMB and WAEC the first time.',
    avatarUrl: avatar('tunde'),
    createdAt: '2026-09-14T10:30:00Z',
  },
  {
    id: 'usr_kola',
    username: 'kolacreates',
    displayName: 'Kola Adeyemi',
    bio: 'Graphic designer, Ikeja.',
    avatarUrl: null,
    createdAt: '2026-10-20T15:00:00Z',
  },
  {
    id: 'usr_ngozi',
    username: 'ngozi',
    displayName: 'Ngozi Eze',
    bio: 'Caterer and cooking teacher in Port Harcourt.',
    avatarUrl: avatar('ngozi'),
    createdAt: '2026-08-30T07:00:00Z',
  },
  {
    id: 'usr_tobi',
    username: 'beatsbytobi',
    displayName: 'Tobi Ogunleye',
    bio: 'Producer. Afrobeats, amapiano, street-pop.',
    avatarUrl: avatar('tobi'),
    createdAt: '2026-11-01T19:00:00Z',
  },
  {
    id: 'usr_amaka',
    username: 'amaka',
    displayName: 'Amaka Obi',
    bio: 'Handmade skincare from Enugu.',
    avatarUrl: avatar('amaka'),
    createdAt: '2026-09-05T09:00:00Z',
  },
  {
    id: 'usr_funmi',
    username: 'funmi',
    displayName: 'Funmi Lawal',
    bio: 'Personal trainer.',
    avatarUrl: avatar('funmi'),
    createdAt: '2026-11-20T07:00:00Z',
  },
  {
    id: 'usr_zainab',
    username: 'zainab',
    displayName: 'Zainab Musa',
    bio: 'Writer from Kano.',
    avatarUrl: avatar('zainab'),
    createdAt: '2026-11-12T15:00:00Z',
  },
  {
    id: 'usr_emeka',
    username: 'emeka',
    displayName: 'Emeka Nnaji',
    bio: null,
    avatarUrl: null,
    createdAt: '2026-11-25T11:00:00Z',
  },
];
