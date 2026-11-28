/**
 * Android SMS auto-read hook. Replaced by the SMS Retriever implementation in
 * use-sms-code.android.ts; on iOS the OS one-time-code autofill handles it instead.
 */
export function useSmsCode(_onCode: (code: string) => void) {}
