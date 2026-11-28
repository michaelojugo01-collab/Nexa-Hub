import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricSupport =
  { available: true; label: string } | { available: false; reason: 'no-hardware' | 'not-enrolled' };

/** What the device offers. Face ID needs a development build (Expo Go falls back to passcode). */
export async function getBiometricSupport(): Promise<BiometricSupport> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) {
      return { available: false, reason: 'no-hardware' };
    }
    if (!(await LocalAuthentication.isEnrolledAsync())) {
      return { available: false, reason: 'not-enrolled' };
    }
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    return { available: true, label: face ? 'Face ID / face unlock' : 'Fingerprint' };
  } catch {
    return { available: false, reason: 'no-hardware' };
  }
}

/** Shows the OS prompt. The OS may fall back to the device passcode after failed attempts. */
export async function authenticateWithBiometrics(promptMessage = 'Unlock Nexa Hub') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}
