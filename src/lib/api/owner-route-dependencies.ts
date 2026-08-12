import { getOwnerSessionFromHeaders, type OwnerIdentity } from '@/lib/auth/config';
import { getAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-runtime';
import type { AnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-workflow';

export type OwnerRouteDependencies = Readonly<{
  getOwner: (headers: Headers) => Promise<OwnerIdentity | null>;
  getRepository: () => AnalysisWorkflowRepository;
}>;

/** Production defaults retain Better Auth; route factories only make tests injectable. */
export const productionOwnerRouteDependencies: OwnerRouteDependencies = Object.freeze({
  getOwner: getOwnerSessionFromHeaders,
  getRepository: getAnalysisWorkflowRepository,
});
