<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/abdf4398-60d0-456c-abef-b75af945cf23

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Деплой на Vercel (Бесплатный хостинг)

Проект полностью оптимизирован для бесплатного деплоя на Vercel с автоматическим серверным проксированием Ozon Seller API:

1. **Серверный прокси:** В репозитории уже настроены файлы:
   - `vercel.json` — конфигурация маршрутизации SPA и заголовков CORS.
   - `api/ozon/[...path].ts` — Vercel Serverless Function, перенаправляющая запросы к `https://api-seller.ozon.ru` с передачей `Client-Id` и `Api-Key`.
2. **Пуш в GitHub:** Закоммитьте все файлы, включая `vercel.json` и папку `api/`, в ваш GitHub репозиторий:
   ```bash
   git add .
   git commit -m "Add Vercel proxy for Ozon Seller API"
   git push origin main
   ```
3. **Импорт в Vercel:** На сайте [vercel.com](https://vercel.com) нажмите **Add New Project**, выберите ваш репозиторий и нажмите **Deploy**. Настройки сборки (Framework: Vite, Build: `vite build`, Output: `dist`) определятся автоматически.
4. После деплоя в модальном окне Ozon введите ваши Client-Id и Api-Key — проверка ключа и синхронизация будут выполняться без ошибки 404!

