import type { CsvImportInput, ImportReport } from '@/features/imports/import-service';
import type { NormalizedMarketRecord, SourceStatus } from '@/features/market/types';

export type ActiveSearchInput = Readonly<{
  query: string;
  limit?: number;
}>;

export interface MarketAdapter {
  readonly sourceKey: string;
  getStatus(): Promise<SourceStatus>;
  searchActive(input: ActiveSearchInput): Promise<readonly NormalizedMarketRecord[]>;
  importSales(input: CsvImportInput): Promise<ImportReport>;
}