import { useEffect, useState } from 'react';

import { secureStorage } from '@/lib/auth/secure-storage';

/** The dismissible "Add your bank account" reminder (payouts are module F7). */
export function usePayoutReminder() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void secureStorage.getPayoutReminderDismissed().then((dismissed) => {
      if (active) setVisible(!dismissed);
    });
    return () => {
      active = false;
    };
  }, []);

  function dismiss() {
    setVisible(false);
    void secureStorage.setPayoutReminderDismissed();
  }

  return { visible, dismiss };
}
