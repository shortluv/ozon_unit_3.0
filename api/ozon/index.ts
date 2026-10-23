/**
 * Vercel Serverless Function: Root handler for /api/ozon and /api/ozon?path=...
 */
import { handleOzonProxy, VercelProxyRequest, VercelProxyResponse } from '../../src/server/ozonProxy';

export default async function handler(req: VercelProxyRequest, res: VercelProxyResponse) {
  return handleOzonProxy(req, res);
}
