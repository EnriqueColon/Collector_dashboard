# Deployment Guide — Vercel

This guide covers deploying the Collector Dashboard to Vercel.

## Architecture on Vercel

- **Frontend**: React/Vite app built to `dist/` and served as a static site via Vercel's CDN
- **Backend API**: `api/sheet-data.js` runs as a Vercel Serverless Function
- **Weekly Sync**: `api/cron/sync.js` runs every Monday at 9 AM UTC via Vercel Cron (Pro plan required)

Every time the dashboard loads, it fetches live data from Google Sheets, so data is always current regardless of the cron schedule.

---

## First-Time Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Link the project

```bash
vercel link
```

Follow the prompts to connect to your Vercel account and project.

### 3. Set Environment Variables

In the Vercel dashboard → **Project Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | The full service account JSON (single line) |
| `CRON_SECRET` | A random secret string (protects the cron endpoint) |

To get the service account JSON on one line, run:
```bash
cat .env.server | grep VITE_GOOGLE_SERVICE_ACCOUNT_KEY | cut -d= -f2-
```

> **Important**: Use `GOOGLE_SERVICE_ACCOUNT_KEY` (without the `VITE_` prefix) in Vercel — it is a server-side secret and should never be exposed to the browser.

### 4. Deploy

```bash
vercel --prod
```

---

## Subsequent Deployments

Push to the `main` branch on GitHub. If you have connected the Vercel project to the GitHub repo, Vercel will automatically redeploy on every push.

Or deploy manually:
```bash
vercel --prod
```

---

## Weekly Data Sync (Cron)

`vercel.json` schedules `api/cron/sync` to run every Monday at 9 AM UTC:

```json
"crons": [{ "path": "/api/cron/sync", "schedule": "0 9 * * 1" }]
```

This verifies the Google Sheets connection is healthy and logs the row count.

> **Note**: Vercel Cron Jobs require the **Pro plan**. On the free Hobby plan, the cron will not run — but the dashboard will still fetch live data on every page load.

You can trigger the cron manually to test it:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/sync
```

---

## Local Development

The Express server (`server.js`) is still used for local development:

```bash
# Run both frontend and backend locally
npm run dev:full
```

This starts:
- Vite dev server on `http://localhost:5173`
- Express backend on `http://localhost:3001`

Vite proxies `/api` requests to the Express server automatically.

---

## Vercel Deployment Checklist

- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` set in Vercel environment variables
- [ ] `CRON_SECRET` set in Vercel environment variables
- [ ] Google Sheet shared with service account email (`collector-dashboard@collector-dashboard-484215.iam.gserviceaccount.com`)
- [ ] Deployed successfully (`vercel --prod`)
- [ ] Dashboard loads and data appears
- [ ] `/api/cron/sync` responds correctly when triggered manually

---

## Troubleshooting

### Data not loading
- Check Vercel Function Logs in the dashboard
- Verify `GOOGLE_SERVICE_ACCOUNT_KEY` is set and valid
- Confirm the Google Sheet is shared with the service account email

### Cron not running
- Cron Jobs require Vercel Pro plan
- Verify `CRON_SECRET` is set
- Check Vercel → Project → Cron Jobs tab for run history

### Build fails
- Run `npm run build` locally first to catch TypeScript/build errors
- Check Vercel build logs for details

---

## Security Notes

- **Never commit** `.env`, `.env.server`, or any file containing the service account key
- `GOOGLE_SERVICE_ACCOUNT_KEY` on Vercel is a server-side secret — it is never sent to the browser
- The `CRON_SECRET` prevents unauthorized external triggers of the cron endpoint
