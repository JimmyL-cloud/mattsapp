import { databaseIsConfigured, getDatabase } from '@/lib/db/client';
import {
  InMemoryMarketRecordRepository,
  PostgresMarketRecordRepository,
  type MarketRecordRepository,
} from './market-records';

const runtime = globalThis as typeof globalThis & {
  __mattsappMarketRepository?: MarketRecordRepository;
};

export function getMarketRecordRepository(): MarketRecordRepository {
  runtime.__mattsappMarketRepository ??= databaseIsConfigured()
    ? new PostgresMarketRecordRepository(getDatabase())
    : new InMemoryMarketRecordRepository();
  return runtime.__mattsappMarketRepository;
}
