import { useEffect, useRef } from 'react';

import SmsRetriever from '../../../modules/sms-retriever';

/** Pulls the 6-digit code out of an SMS like "Your Nexa Hub code is 123456 … FA+9qCX9VSu". */
export function extractCode(message: string) {
  return /(?:^|\D)(\d{6})(?:\D|$)/.exec(message)?.[1] ?? null;
}

/**
 * Android SMS Retriever (development builds only; a no-op in Expo Go where the native module
 * is missing). Listens for up to 5 minutes while the code screen is open.
 */
export function useSmsCode(onCode: (code: string) => void) {
  const callback = useRef(onCode);
  useEffect(() => {
    callback.current = onCode;
  });

  useEffect(() => {
    if (!SmsRetriever) return;
    const module = SmsRetriever;
    const sub = module.addListener('onSmsReceived', ({ message }) => {
      const code = extractCode(message);
      if (code) callback.current(code);
    });
    module.start().catch(() => undefined); // falls back to typing / OS autofill
    return () => {
      sub.remove();
      module.stop();
    };
  }, []);
}
