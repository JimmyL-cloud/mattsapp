import { databaseIsConfigured, getDatabase } from '@/lib/db/client';
import {
  InMemoryAnalysisWorkflowRepository,
  PostgresAnalysisWorkflowRepository,
  type AnalysisWorkflowRepository,
} from './analysis-workflow';

const runtime = globalThis as typeof globalThis & { __mattsappAnalysisWorkflowRepository?: AnalysisWorkflowRepository };

/** Real requests use Neon; the in-memory implementation only keeps local/test startup from coupling to a database. */
export function getAnalysisWorkflowRepository(): AnalysisWorkflowRepository {
  runtime.__mattsappAnalysisWorkflowRepository ??= databaseIsConfigured()
    ? new PostgresAnalysisWorkflowRepository(getDatabase())
    : new InMemoryAnalysisWorkflowRepository();
  return runtime.__mattsappAnalysisWorkflowRepository;
}
