# Accounts on the GitHub Pages app

The recommended public setup is now **Cloudflare Workers + D1**. See
[CLOUDFLARE_ACCOUNTS.md](CLOUDFLARE_ACCOUNTS.md) for the free persistent option.
The Render setup below remains available for people who prefer the existing
Docker API.

The public URL is a static demo by default. GitHub Pages can serve React, but it cannot run
the Node API that stores accounts, sessions, nutrition cache and per-user history. That is why
the demo shows **Start the demo** instead of the registration form.

To make the same public URL support accounts with Render:

1. Deploy `render-api.yaml` as a new Render Blueprint, or create a Docker Web Service from
   `./api/Dockerfile` with `./api` as its Docker context. Attach a persistent disk mounted at
   `/data`.
2. Keep these API values aligned with the public app origin:

   ```text
   RP_ID=nathanmarinas2.github.io
   ORIGIN=https://nathanmarinas2.github.io
   CORS_ORIGINS=https://nathanmarinas2.github.io
   COOKIE_SAMESITE=None
   ```

   `ORIGIN` is an origin, not the full `/openGym/app` path. The API URL must be HTTPS.
3. In GitHub, open the repository settings and add a repository variable named
   `LIFTNEX_API_ORIGIN` with the Render URL, for example:

   ```text
   https://liftnex-api.onrender.com
   ```

4. Run the **Deploy LiftNex web** workflow manually once. The workflow then builds with
   `VITE_DEMO=0`, so `/openGym/app/#/home` shows account creation and uses the API for login,
   sync, Open Food Facts proxying and Gemini coach requests.

The API disk is essential: without it, a restart loses users and history. Keep a backup of its
`/data` directory. For a private, single-origin deployment, Docker Compose remains simpler and
does not need CORS or cross-site cookies.
