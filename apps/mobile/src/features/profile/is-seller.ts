import type { Me } from '@nexa/api-contract';

/** Reads the role the server assigned. Never computed client-side. */
export const isSeller = (user: Me | null | undefined) => !!user?.roles.includes('seller');
