# Hosting on SmarterASP.NET (Windows / IIS)

The site is a static build (no server code), so it runs on IIS with one generated file, `web.config`.

- `npm run build:iis` builds for `https://the-closets.com` (override with `SITE_URL=...`) and writes `build/web.config`.
- `scripts/iis-webconfig.js` generates `web.config` from `vercel.json`, so redirects, rewrites and headers stay the same on both hosts. Edit `vercel.json`, never `web.config`.
- `.github/workflows/deploy-smarterasp.yml` builds and uploads over FTPS. It runs only when started by hand and needs the secrets `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.

## Differences from Vercel
- The report-only Content-Security-Policy header is not carried over (it blocks nothing on Vercel either).
- Unknown paths show the home page with status 200.
- `www.` is redirected to the bare domain, and http to https.

## Cut-over order
1. Create a second site in the SmarterASP panel and deploy there first; test on its temporary address.
2. Back up the files of the current the-closets.com site.
3. Deploy to the the-closets.com site root.
4. Add `https://the-closets.com` to the Supabase Auth redirect URLs. The edge functions already allow this origin.
5. Keep the Vercel site running: printed QR codes and old links point to it.
