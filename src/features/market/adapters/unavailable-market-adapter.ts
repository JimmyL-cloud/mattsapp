import type { CsvImportInput, ImportReport } from '@/features/imports/import-service';
import type { NormalizedMarketRecord, SourceStatus } from '@/features/market/types';
import type { ActiveSearchInput, MarketAdapter } from './market-adapter';

export class UnavailableMarketAdapter implements MarketAdapter {
  constructor(readonly sourceKey: string, private readonly reason: string) {}

  async getStatus(): Promise<SourceStatus> {
    return {
      sourceKey: this.sourceKey,
      status: 'AWAITING_CREDENTIALS',
      lastAttemptAt: null,
      lastSuccessfulRefreshAt: null,
      message: this.reason,
    };
  }

  async searchActive(input: ActiveSearchInput): Promise<readonly NormalizedMarketRecord[]> {
    void input;
    return [];
  }

  async importSales(input: CsvImportInput): Promise<ImportReport> {
    void input;
    throw new Error(`${this.sourceKey} is unavailable: ${this.reason}`);
  }
}