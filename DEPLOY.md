# Deploying Keyflow

```
Browser ──▶ Vercel (React SPA)                keyflow-bay.vercel.app
                │  /api/:path* rewrite (same origin, first-party cookies)
                ▼
            Azure App Service (Django + gunicorn)   keyflow-api.azurewebsites.net
                │
                ▼
            Postgres (Neon or Azure Database for PostgreSQL)
```

Both halves deploy automatically on every push to `main`:

| Part | Trigger | Where |
| --- | --- | --- |
| Frontend | Vercel Git integration | `frontend/` root directory |
| Backend | `.github/workflows/backend-azure.yml` | `backend/**` changes |

Migrations run on every App Service start (`backend/startup.sh`), so a deploy
that changes models applies them before gunicorn serves traffic.

## One-time setup

1. **Create the database.** A free Neon (or Supabase) Postgres is enough:
   copy the connection string and make sure it ends with `?sslmode=require`.
   Azure Database for PostgreSQL Flexible Server also works if the student
   credit covers it.

2. **Log in and create the Azure resources.**

   ```bash
   az login
   export DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   bash infra/azure-setup.sh
   ```

   The script creates the resource group, a Linux B1 plan, the web app, Always
   On, HTTPS-only, the health check (`/api/health/`) and every app setting.
   It prints the public URL. Override `APP`, `REGION`, `SKU` or `FRONTEND_URL`
   with environment variables if needed. Student subscriptions can restrict
   regions — pick one from `az policy assignment list` or the portal.

3. **Store the publish profile.** The workflow authenticates with a GitHub
   secret:

   ```bash
   az webapp deployment list-publishing-profiles \
     --resource-group keyflow-rg --name keyflow-api --xml
   ```

   GitHub → Settings → Secrets and variables → Actions → New repository secret
   `AZURE_WEBAPP_PUBLISH_PROFILE`, paste the whole XML.

4. **Connect Vercel.** Import the repository, set **Root Directory** to
   `frontend`, framework Vite. No environment variables are needed: the
   browser calls `/api` on the same origin and `frontend/vercel.json` rewrites
   it to Azure. If you chose another Azure app name, update the `destination`
   in `frontend/vercel.json` (`https://<app>.azurewebsites.net/api/:path*`).

5. **Push to `main`.** Vercel deploys the frontend; the GitHub workflow
   deploys the backend. First deploy takes a few minutes (pip install).

6. **Migrate existing data (optional).** From the old environment:

   ```bash
   python manage.py dumpdata keyflow auth --indent 0 > data.json
   # then locally, against the new DATABASE_URL:
   python manage.py loaddata data.json
   ```

## Environment variables

Set on the App Service by `infra/azure-setup.sh` (App Service → Configuration):

| Name | Value |
| --- | --- |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_SECRET_KEY` | generated once, kept on re-runs |
| `DJANGO_ALLOWED_HOSTS` | `keyflow-api.azurewebsites.net,keyflow-bay.vercel.app` — the Vercel host arrives in `X-Forwarded-Host` through the rewrite, so both must be listed |
| `FRONTEND_URL` | `https://keyflow-bay.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://keyflow-api.azurewebsites.net,https://keyflow-bay.vercel.app` |
| `DATABASE_URL` | Postgres URL, `sslmode=require` |
| `DJANGO_SECURE_SSL_REDIRECT` | `True` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
| `WEBSITES_PORT` | `8000` |

Vercel needs no variables. `VITE_API_BASE_URL` must stay empty so the app talks
to its own origin (that is what keeps the session cookie first-party).

## Redeploying

- **Automatic:** push to `main`. Frontend changes deploy on Vercel, backend
  changes deploy through GitHub Actions.
- **Manual backend:** GitHub → Actions → *Deploy backend* → *Run workflow*, or
  `az webapp deploy --resource-group keyflow-rg --name keyflow-api --src-path backend.zip`.
- **Manual frontend:** Vercel → Deployments → *Redeploy*.
- **Rollback:** re-run an older successful *Deploy backend* workflow (it deploys
  that commit), or use Vercel's *Instant Rollback* for the SPA. Database
  migrations are not rolled back automatically.

## Logs

```bash
az webapp log tail --resource-group keyflow-rg --name keyflow-api
```

Django logs to stdout (requests, errors, migration output from `startup.sh`).
The health check endpoint is `GET /api/health/` — App Service restarts an
instance if it starts failing.

## Cost

- App Service **B1 Linux** is roughly US$13–18/month depending on region
  (check the pricing calculator). The Azure for Students credit (US$100/year)
  covers several months.
- Always On is included on Basic and above; the Free F1 tier sleeps, has a
  daily CPU quota and cannot run Always On, so it is not used here.
- Neon/Supabase Postgres has a free tier that is enough for this app.
- To stop billing: `az appservice plan update --name keyflow-plan --resource-group keyflow-rg --sku F1`
  (or delete everything with `az group delete --name keyflow-rg`).
- Check remaining credit in the Azure portal → Cost Management → Credits.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| 502/503 right after deploy | `az webapp log tail`; check `startup.sh` ran, `WEBSITES_PORT=8000`, and that `DATABASE_URL` is reachable. |
| `DisallowedHost` | Add the host to `DJANGO_ALLOWED_HOSTS`. The Vercel rewrite forwards its own Host only if you point it there directly; the Azure host must always be present. |
| CSRF 403 on sign-in | `CSRF_TRUSTED_ORIGINS` must include the exact Vercel URL (`https://…`) and the Azure app URL. Re-run `infra/azure-setup.sh` after changing the frontend domain. |
| Signed in locally, not in production | The `/api` rewrite must be same-origin. `curl -i https://<vercel-domain>/api/health/` should return the Azure JSON, and the response must include `Set-Cookie`. |
| Static files 404 in `/admin` | `collectstatic` runs on startup; confirm `STATIC_ROOT` is writable and WhiteNoise is in `MIDDLEWARE`. |
| DB errors about SSL | Append `?sslmode=require` to `DATABASE_URL`. |
| Login works but sessions vanish after reload | Cookies are `Secure` when `DJANGO_DEBUG=False`; make sure you are on `https://`. |
