import { File, Paths } from 'expo-file-system';

import type { JobStore, UploadJob } from './uploader';

/** Upload progress saved on the phone, so an upload resumes after the app is closed. */
export function fileJobStore(fileName = 'nexa-uploads-v1.json'): JobStore {
  const file = () => new File(Paths.document, fileName);
  return {
    async load() {
      try {
        const f = file();
        return f.exists ? (JSON.parse(await f.text()) as UploadJob[]) : [];
      } catch {
        return [];
      }
    },
    async save(jobs) {
      const f = file();
      if (!f.exists) f.create();
      f.write(JSON.stringify(jobs.filter((j) => j.status !== 'done')));
    },
  };
}

export function memoryJobStore(): JobStore & { jobs: UploadJob[] } {
  const store = {
    jobs: [] as UploadJob[],
    async load() {
      return JSON.parse(JSON.stringify(store.jobs)) as UploadJob[];
    },
    async save(jobs: UploadJob[]) {
      store.jobs = JSON.parse(JSON.stringify(jobs)) as UploadJob[];
    },
  };
  return store;
}
