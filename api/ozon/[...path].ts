/**
 * Vercel Serverless Function: Catch-all proxy for /api/ozon/*
 */
import { handleOzonProxy, VercelProxyRequest, VercelProxyResponse } from '../../src/server/ozonProxy';

export default async function handler(req: VercelProxyRequest, res: VercelProxyResponse) {
  return handleOzonProxy(req, res);
}
