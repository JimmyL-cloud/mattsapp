import type { CsvImportInput, ImportReport } from '@/features/imports/import-service';
import { CsvImportService } from '@/features/imports/import-service';
import type { NormalizedMarketRecord, SourceStatus } from '@/features/market/types';
import type { ActiveSearchInput, MarketAdapter } from './market-adapter';

export class CsvMarketAdapter implements MarketAdapter {
  constructor(
    private readonly service: CsvImportService,
    readonly sourceKey: string,
    private readonly sourceLabel: string,
  ) {}

  async getStatus(): Promise<SourceStatus> {
    return {
      sourceKey: this.sourceKey,
      status: 'MANUAL',
      lastAttemptAt: null,
      lastSuccessfulRefreshAt: null,
      message: 'Ready for user-provided CSV imports; no live source is implied.',
    };
  }

  async searchActive(input: ActiveSearchInput): Promise<readonly NormalizedMarketRecord[]> {
    void input;
    return [];
  }

  async importSales(input: CsvImportInput): Promise<ImportReport> {
    return this.service.importCsv({
      ...input,
      sourceKey: this.sourceKey,
      sourceLabel: this.sourceLabel,
    });
  }
}