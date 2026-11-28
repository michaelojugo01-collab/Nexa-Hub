import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { SmsRetrieverModuleEvents } from './SmsRetriever.types';

declare class SmsRetrieverModule extends NativeModule<SmsRetrieverModuleEvents> {
  /** Starts listening for up to 5 minutes. Resolves once the listener is registered. */
  start(): Promise<boolean>;
  stop(): void;
  /** 11-character app hash the backend appends to OTP SMS. Null if it can't be computed. */
  getAppHash(): string | null;
}

/** Null on iOS, web, Expo Go, and Jest: the module only exists in Android development builds. */
export default requireOptionalNativeModule<SmsRetrieverModule>('SmsRetriever');
