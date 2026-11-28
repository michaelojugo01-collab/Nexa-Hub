import { useEffect } from 'react';

import { useOnline } from '@/lib/use-online';

import { restoreUploads, uploader } from './index';

/**
 * Mounted once while signed in: reloads uploads saved before the app closed (they carry on
 * from the last finished part) and retries uploads that stopped for lack of connection as
 * soon as the phone is back online.
 */
export function UploadResumer() {
  const online = useOnline();

  useEffect(() => {
    void restoreUploads();
  }, []);

  useEffect(() => {
    if (!online) return;
    for (const job of uploader.all()) {
      const network = job.error?.code === 'NETWORK_ERROR' || job.error?.code === 'UPLOAD_FAILED';
      if (job.status === 'failed' && network && job.uploadId) void uploader.resume(job.id);
    }
  }, [online]);

  return null;
}
