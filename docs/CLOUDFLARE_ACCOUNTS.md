# Public LiftNex accounts with Cloudflare

LiftNex uses Cloudflare Workers + D1 for the public deployment. The Worker
serves the frontend and API from one origin, avoiding cross-site cookie issues
on mobile; D1 stores users and each profile's complete synced state.

## 1. Create the D1 database

From the repository root:

```powershell
cd cloudflare
npm exec wrangler login
npm exec wrangler d1 create liftnex
```

Copy the returned `database_id` into `cloudflare/wrangler.toml` in place of
`REPLACE_WITH_D1_DATABASE_ID`.

Build the frontend, apply the schema and deploy the single web/API service:

```powershell
npm --prefix ../frontend ci --no-audit --no-fund
$env:VITE_DEMO = "0"
$env:VITE_API_ORIGIN = ""
npm --prefix ../frontend run build
npm exec wrangler d1 migrations apply liftnex --remote
npm exec wrangler secret put GEMINI_API_KEY
npm exec wrangler deploy
```

`GEMINI_API_KEY` is optional. If it is not set, the app keeps its local coach
insights. Never put this key in the frontend or in a GitHub variable.

## 2. Open and check the public app

Render's URL is no longer involved. Use the Worker URL printed by Wrangler:

```powershell
Invoke-RestMethod "https://liftnex-api.<tu-subdominio>.workers.dev/api/health"
```

The response should contain `ok: true` and `provider: cloudflare-d1`.

The application is available at the same hostname:

```text
https://liftnex-api.<tu-subdominio>.workers.dev/#/home
```

Create your first account there with username and password. The Worker
deployment does not require passkeys.

## 3. Optional GitHub Pages fallback

If you want to keep the GitHub Pages URL as a separate frontend, open the
repository's Actions variables page and create:

```text
Name:  LIFTNEX_API_ORIGIN
Value: https://liftnex-api.<tu-subdominio>.workers.dev
```

Run **Deploy LiftNex web** manually. The Pages workflow detects this variable
and builds with `VITE_DEMO=0`. The fallback URL remains:

```text
https://nathanmarinas2.github.io/openGym/app/
```

The Worker keeps the GitHub Pages origin in `CORS_ORIGINS` for this fallback.
If you use another frontend domain, update `CORS_ORIGINS` and deploy again.

## GitHub Actions deployment

The repository includes `.github/workflows/cloudflare-api.yml`. To use it,
create these GitHub Actions secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The API token needs permission to deploy Workers and manage the D1 database.
The first deployment is usually easier from Wrangler because it creates the
database and lets you copy its ID into the configuration. Later changes can be
deployed from the workflow. That workflow builds `frontend/dist` and deploys
the web/API Worker whenever `cloudflare/**` or `frontend/**` changes.

## Notes

- The current public Worker uses username/password accounts, so passkeys are
  not required.
- Session tokens are opaque, hashed before storage, and sent as HttpOnly
  cookies.
- The state is stored per user in D1, including workouts, rest logs, steps,
  nutrition, weight, water, fasting, recipes and coach history.
- Open Food Facts is proxied through the Worker and cached in D1.
- The D1 schema starts empty. Existing files under `data/` are deliberately not
  uploaded or committed; create a new account or perform a separate private
  migration if you need to preserve a local profile.
- Local browser notifications and the workout rest timer continue to work. The
  old server-side Web Push scheduler is not enabled in the Worker build yet.
