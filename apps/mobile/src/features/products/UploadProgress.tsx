import { Text, View } from 'react-native';

import { Button } from '@/components';

import { formatBytes } from './product-ui';
import type { UploadJob } from './upload';

/** Progress bar + pause/resume/retry/cancel for one upload job. */
export function UploadProgress({
  job,
  onPause,
  onResume,
  onCancel,
  testID,
}: {
  job: UploadJob;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  testID: string;
}) {
  const fraction = job.sizeBytes ? Math.min(1, job.sentBytes / job.sizeBytes) : 0;
  const pct = Math.round(fraction * 100);
  const label =
    job.status === 'paused'
      ? `Paused at ${pct}%`
      : job.status === 'retrying'
        ? `Connection dropped. Retrying… (${pct}%)`
        : job.status === 'failed'
          ? `${job.error?.message ?? 'The upload stopped.'} It will continue from ${pct}%.`
          : job.status === 'completing'
            ? 'Finishing…'
            : `Uploading ${pct}% · ${formatBytes(job.sentBytes)} of ${formatBytes(job.sizeBytes)}`;
  const failedFinal = job.status === 'failed' && !job.uploadId;

  return (
    <View className="gap-2 rounded-lg border border-border p-3" testID={testID}>
      <Text className="text-sm font-medium text-text" numberOfLines={1}>
        {job.fileName}
      </Text>
      <View
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
        testID={`${testID}-bar`}>
        <View className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </View>
      <Text
        className={job.status === 'failed' ? 'text-sm text-error' : 'text-sm text-text-muted'}
        accessibilityLiveRegion="polite"
        testID={`${testID}-label`}>
        {failedFinal ? (job.error?.message ?? 'This file can’t be uploaded.') : label}
      </Text>
      <View className="flex-row gap-2">
        {job.status === 'uploading' || job.status === 'retrying' ? (
          <Button
            label="Pause"
            size="sm"
            variant="secondary"
            onPress={onPause}
            testID={`${testID}-pause`}
          />
        ) : null}
        {job.status === 'paused' || (job.status === 'failed' && !failedFinal) ? (
          <Button
            label={job.status === 'paused' ? 'Resume' : 'Retry'}
            size="sm"
            onPress={onResume}
            testID={`${testID}-resume`}
          />
        ) : null}
        {job.status !== 'completing' ? (
          <Button
            label="Cancel"
            size="sm"
            variant="ghost"
            onPress={onCancel}
            testID={`${testID}-cancel`}
          />
        ) : null}
      </View>
    </View>
  );
}
