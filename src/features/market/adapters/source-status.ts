export type SourceConnectionStatus = 'CONNECTED' | 'MANUAL' | 'STALE' | 'UNAVAILABLE' | 'AWAITING_CREDENTIALS';

export type SourceState = Readonly<{
  key: string;
  label: string;
  configuredMode: Exclude<SourceConnectionStatus, 'STALE'>;
  status: SourceConnectionStatus;
  cachedRecordCount: number;
  lastAttemptAt: string | null;
  lastSuccessfulRefreshAt: string | null;
  message: string;
}>;