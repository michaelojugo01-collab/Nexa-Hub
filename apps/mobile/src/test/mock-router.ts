/** Use with: jest.mock('expo-router', () => require('@/test/mock-router')); */
export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: () => false,
};
export const Redirect = () => null;
export const Stack = { Screen: () => null };
export const useNavigation = () => ({ dispatch: jest.fn() });
export const usePreventRemove = jest.fn();
