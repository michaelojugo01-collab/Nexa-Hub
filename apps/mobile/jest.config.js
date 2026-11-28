/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 / Worklets: load their JS (web) implementations instead of native modules.
  resolver: 'react-native-reanimated/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Packages that ship untranspiled ESM/TS and must go through Babel.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|expo-modules-core|@shopify/flash-list|nativewind|react-native-css-interop|@nexa/.*))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
};
