/**
 * Ozon Seller API Proxy Handler for Vercel Serverless Functions and Node environments
 *
 * Перенаправляет запросы от клиента к https://api-seller.ozon.ru с передачей заголовков
 * Client-Id, Api-Key и Content-Type. Обеспечивает корректную работу в продакшене Vercel,
 * устраняя ошибку HTTP 404 при вызове методов Ozon.
 */

import type { IncomingMessage, ServerResponse } from 'http';

export interface VercelProxyRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
  body?: any;
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface VercelProxyResponse extends ServerResponse {
  status?: (code: number) => VercelProxyResponse;
  json?: (body: any) => VercelProxyResponse;
  send?: (body: any) => VercelProxyResponse;
}

/**
 * Безопасная отправка ответа как в среде Vercel, так и в стандартном Node.js http
 */
function sendResponse(
  res: VercelProxyResponse,
  statusCode: number,
  data: any,
  contentType = 'application/json'
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);

  const payload = typeof data === 'string' ? data : JSON.stringify(data);

  if (typeof res.status === 'function') {
    res.status(statusCode);
  }
  if (typeof res.send === 'function') {
    res.send(payload);
  } else {
    res.end(payload);
  }
}

/**
 * Извлекает путь к целевому методу Ozon API из запроса Vercel
 * Поддерживает:
 * - req.query.path: ['v3', 'product', 'list'] (из api/ozon/[...path].ts)
 * - req.query.path: 'v3/product/list' (из query string ?path=...)
 * - req.url: '/api/ozon/v3/product/list' (из стандартного HTTP запроса)
 */
export function extractOzonPath(req: VercelProxyRequest): string {
  if (req.query?.path) {
    if (Array.isArray(req.query.path)) {
      return req.query.path.join('/');
    }
    if (typeof req.query.path === 'string') {
      return req.query.path.replace(/^\/+/, '');
    }
  }

  if (req.url) {
    const [pathname] = req.url.split('?');
    const clean = pathname.replace(/^\/api\/ozon\/?/i, '').replace(/^\/+/, '');
    if (clean) return clean;
  }

  return '';
}

/**
 * Основной обработчик проксирования запросов к Ozon Seller API на Vercel
 */
export async function handleOzonProxy(
  req: VercelProxyRequest,
  res: VercelProxyResponse
): Promise<void> {
  // 1. Установка CORS-заголовков для браузера
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Client-Id, Api-Key, client-id, api-key'
  );

  // 2. Предварительный CORS preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  try {
    const ozonPath = extractOzonPath(req);

    // Health-check / диагностика при обращении к корню /api/ozon
    if (!ozonPath) {
      sendResponse(res, 200, {
        status: 'ok',
        service: 'Ozon Seller API Proxy (Vercel Serverless Function)',
        timestamp: new Date().toISOString(),
        message: 'Прокси активен и готов к приёму запросов Ozon Seller API.',
      });
      return;
    }

    const targetUrl = `https://api-seller.ozon.ru/${ozonPath}`;

    // 3. Сбор и валидация авторизационных заголовков Ozon
    const clientId =
      (req.headers['client-id'] as string) ||
      (req.headers['Client-Id'] as string) ||
      '';
    const apiKey =
      (req.headers['api-key'] as string) ||
      (req.headers['Api-Key'] as string) ||
      '';
    const contentType =
      (req.headers['content-type'] as string) || 'application/json';

    const headersToSend: Record<string, string> = {
      'Content-Type': contentType,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; OzonUnitEconomicsApp/1.0; +https://github.com)',
    };

    if (clientId) headersToSend['Client-Id'] = String(clientId).trim();
    if (apiKey) headersToSend['Api-Key'] = String(apiKey).trim();

    // 4. Подготовка тела запроса (поддерживает как уже распарсенный JSON, так и входящий стрим)
    let bodyData: string | undefined = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body !== undefined && req.body !== null) {
        bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        bodyData = await new Promise<string>((resolve) => {
          let chunks = '';
          req.on('data', (chunk: any) => {
            chunks += chunk;
          });
          req.on('end', () => resolve(chunks));
          req.on('error', () => resolve(''));
        });
      }
      if (!bodyData) {
        bodyData = '{}';
      }
    }

    // 5. Запрос к официальному серверу Ozon
    const ozonRes = await fetch(targetUrl, {
      method: req.method || 'POST',
      headers: headersToSend,
      body: bodyData,
    });

    const responseText = await ozonRes.text();
    const ozonContentType = ozonRes.headers.get('content-type') || 'application/json';

    sendResponse(res, ozonRes.status, responseText, ozonContentType);
  } catch (error: any) {
    console.error('Ozon Proxy Vercel Error:', error);
    sendResponse(res, 502, {
      error: {
        message: `Ошибка Vercel Proxy при обращении к Ozon API: ${error?.message || String(error)}`,
        code: 'PROXY_FORWARD_ERROR',
      },
    });
  }
}
