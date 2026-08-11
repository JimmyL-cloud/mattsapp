import { createDemoAnalysis } from '@/features/analysis/demo-analysis';
import { exportAnalysisBundle, exportMarketRowsCsv } from '@/features/analysis/export-service';
import { demoMarketRows } from '@/features/search/demo-market-rows';
import { getOwnerSessionFromHeaders } from '@/lib/auth/config';

function attachment(body: string, filename: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      'content-type': `${contentType}; charset=utf-8`,
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'private, no-store',
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ kind: string }> }) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return Response.json({ error: 'Owner authentication required' }, { status: 401 });
  const { kind } = await context.params;
  if (kind === 'market') {
    const body = exportMarketRowsCsv({ ownerId: owner.id, requestingUserId: owner.id, scope: 'DEMO_ONLY', rows: demoMarketRows });
    return attachment(body, 'mattsapp-demo-market.csv', 'text/csv');
  }
  const analysis = createDemoAnalysis();
  const bundle = exportAnalysisBundle({ ownerId: owner.id, requestingUserId: owner.id, scope: 'DEMO_ONLY', analysis });
  if (kind === 'analysis') return attachment(bundle.json, 'mattsapp-demo-analysis.json', 'application/json');
  if (kind === 'analysis-raw') return attachment(bundle.rawCompsCsv, 'mattsapp-demo-analysis-raw.csv', 'text/csv');
  if (kind === 'analysis-included') return attachment(bundle.includedCompsCsv, 'mattsapp-demo-analysis-included.csv', 'text/csv');
  if (kind === 'analysis-excluded') return attachment(bundle.excludedCompsCsv, 'mattsapp-demo-analysis-excluded.csv', 'text/csv');
  return Response.json({ error: 'Unknown export kind' }, { status: 404 });
}