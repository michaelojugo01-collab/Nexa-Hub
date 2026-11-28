// Fixtures are plain data typed by the generated API types.
// The mock API and the tests both import from here.
export { discoverHome, discoverHomeEmpty } from './discover-home';
export { meBuyer, meSeller } from './me';
export { productRecords, products, toProductSummary, type ProductRecord } from './products';
export { profileFixtures, type ProfileSeed } from './profiles';
export { slugify } from './slugify';
export {
  findStore,
  fixtureFollows,
  reservedSlugs,
  storeRecords,
  stores,
  toPublicStore,
  toSummary,
  type StoreRecord,
} from './stores';
export { categories } from './categories';
export { fixtureUsers, MOCK_OTP_CODE, reservedUsernames, takenUsernames } from './users';
