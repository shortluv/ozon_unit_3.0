import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const ozonProxyConfig = {
    target: 'https://api-seller.ozon.ru',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/ozon/, ''),
    secure: true,
    configure: (proxy: any) => {
      proxy.on('proxyReq', (proxyReq: any, req: any) => {
        // Гарантированная передача заголовков авторизации Ozon в локальном окружении Vite
        const clientId = req.headers['client-id'] || req.headers['Client-Id'];
        const apiKey = req.headers['api-key'] || req.headers['Api-Key'];
        if (clientId) {
          proxyReq.setHeader('Client-Id', String(clientId).trim());
        }
        if (apiKey) {
          proxyReq.setHeader('Api-Key', String(apiKey).trim());
        }
        if (!proxyReq.getHeader('User-Agent')) {
          proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (compatible; OzonUnitEconomicsApp/1.0)');
        }
      });
      proxy.on('error', (err: any, _req: any, res: any) => {
        if (!res.headersSent && typeof res.writeHead === 'function') {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                message: `Ошибка локального Vite Proxy: ${err.message}`,
                code: 'VITE_PROXY_ERROR',
              },
            })
          );
        }
      });
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/ozon': ozonProxyConfig,
      },
    },
    preview: {
      proxy: {
        '/api/ozon': ozonProxyConfig,
      },
    },
  };
});
