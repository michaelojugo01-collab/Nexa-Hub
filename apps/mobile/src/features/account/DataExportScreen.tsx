import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Badge, Button, Card, ErrorState, Screen, Skeleton } from '@/components';
import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { queryKeys } from '@/lib/api/query-keys';

import { InlineNotice } from '../auth/InlineNotice';

const dateFormat = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

/** Request a copy of your data (proposed endpoints). Mock: shows the "requested" state. */
export function DataExportScreen() {
  const status = useQuery({ queryKey: queryKeys.dataExport, queryFn: () => api.getDataExport() });
  const request = useMutation({
    mutationFn: () => api.requestDataExport(),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.dataExport, data),
  });

  let body;
  if (status.isPending) {
    body = <Skeleton className="h-28 w-full rounded-lg" testID="export-loading" />;
  } else if (status.isError) {
    body = (
      <ErrorState
        testID="export-error"
        variant={isOfflineError(status.error) ? 'offline' : 'error'}
        onRetry={() => status.refetch()}
        retrying={status.isRefetching}
      />
    );
  } else if (status.data.status === 'none') {
    body = (
      <View className="gap-4">
        <Button
          label="Request my data"
          onPress={() => request.mutate()}
          loading={request.isPending}
          testID="export-request"
        />
        {request.isError ? (
          <InlineNotice
            tone="error"
            message={
              isOfflineError(request.error)
                ? 'You’re offline. Try again when you’re connected.'
                : errorMessage(request.error)
            }
          />
        ) : null}
      </View>
    );
  } else {
    body = (
      <Card testID={`export-${status.data.status}`}>
        <View className="items-start gap-2">
          <Badge
            label={status.data.status === 'ready' ? 'Ready' : 'Requested'}
            variant={status.data.status === 'ready' ? 'success' : 'warning'}
          />
          <Text className="text-sm text-text">
            {status.data.status === 'ready'
              ? 'Your export is ready. Check your email for the download link.'
              : `Requested on ${status.data.requestedAt ? dateFormat(status.data.requestedAt) : 'today'}. We’ll email you a download link when it’s ready.`}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Screen scroll edges={[]} testID="data-export-screen">
      <Stack.Screen options={{ title: 'Export my data' }} />
      <View className="gap-4 pt-4">
        <Text className="text-sm text-text-muted">
          Get a copy of your profile, orders, purchases and messages. We prepare it in the
          background and email you a link.
        </Text>
        {body}
      </View>
    </Screen>
  );
}
