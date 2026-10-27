#!/usr/bin/env bash
# One-time Azure setup for the Keyflow API on App Service (Linux, Python 3.12).
# Idempotent: safe to run again; it keeps the existing secret key.
#
#   az login
#   export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
#   bash infra/azure-setup.sh
#
# Optional overrides: RG, APP, PLAN, REGION, SKU, FRONTEND_URL.
set -euo pipefail

RG="${RG:-keyflow-rg}"
APP="${APP:-keyflow-api}"
PLAN="${PLAN:-keyflow-plan}"
REGION="${REGION:-centralindia}"      # pick a region allowed by your student policy
SKU="${SKU:-B1}"                     # B1 is the cheapest tier with Always On
FRONTEND_URL="${FRONTEND_URL:-https://keyflow-bay.vercel.app}"
# Vercel proxies /api through to this app, so the frontend host reaches Django
# in the Host/X-Forwarded-Host header and must be allowed too.
FRONTEND_HOST="${FRONTEND_URL#*://}"
FRONTEND_HOST="${FRONTEND_HOST%%/*}"
DATABASE_URL="${DATABASE_URL:-}"

if ! az account show >/dev/null 2>&1; then
  echo "Not signed in. Run: az login" >&2
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  cat >&2 <<'MSG'
DATABASE_URL is empty.

App Service's file share is network storage, so SQLite there is a corruption
risk. Create a Postgres database first (Neon/Supabase free tier, or Azure
Database for PostgreSQL Flexible Server if it is within your student credit)
and export its connection string:

  export DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

Then run this script again.
MSG
  exit 1
fi

echo "==> Resource group $RG ($REGION)"
az group create --name "$RG" --location "$REGION" --output none

echo "==> App Service plan $PLAN ($SKU, Linux)"
az appservice plan create \
  --name "$PLAN" \
  --resource-group "$RG" \
  --is-linux \
  --sku "$SKU" \
  --number-of-workers 1 \
  --output none

if ! az webapp show --resource-group "$RG" --name "$APP" >/dev/null 2>&1; then
  echo "==> Web app $APP"
  az webapp create \
    --resource-group "$RG" \
    --plan "$PLAN" \
    --name "$APP" \
    --runtime "PYTHON|3.12" \
    --output none
fi

SECRET_KEY="$(az webapp config appsettings list \
  --resource-group "$RG" \
  --name "$APP" \
  --query "[?name=='DJANGO_SECRET_KEY'].value | [0]" \
  --output tsv 2>/dev/null || true)"
if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "None" ]; then
  SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')"
  echo "==> Generated DJANGO_SECRET_KEY"
fi

echo "==> App settings"
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings \
    DJANGO_DEBUG=False \
    DJANGO_SECRET_KEY="$SECRET_KEY" \
    DJANGO_ALLOWED_HOSTS="${APP}.azurewebsites.net,${FRONTEND_HOST}" \
    FRONTEND_URL="$FRONTEND_URL" \
    CSRF_TRUSTED_ORIGINS="https://${APP}.azurewebsites.net,${FRONTEND_URL}" \
    CORS_ALLOWED_ORIGINS="https://${APP}.azurewebsites.net,${FRONTEND_URL}" \
    DATABASE_URL="$DATABASE_URL" \
    DJANGO_SECURE_SSL_REDIRECT=True \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    WEBSITES_PORT=8000 \
  --output none

echo "==> Runtime config"
az webapp config set \
  --resource-group "$RG" \
  --name "$APP" \
  --always-on true \
  --min-tls-version 1.2 \
  --ftps-state Disabled \
  --startup-file "bash startup.sh" \
  --generic-configurations '{"healthCheckPath":"/api/health/"}' \
  --output none

az webapp update --resource-group "$RG" --name "$APP" --https-only true --output none
az webapp update --resource-group "$RG" --name "$APP" --client-affinity-enabled false --output none

cat <<MSG

App URL:        https://${APP}.azurewebsites.net
Health check:   https://${APP}.azurewebsites.net/api/health/
Always On:      enabled (no cold starts, no pinger needed)

Next steps
1. Download the publish profile and store it as the GitHub secret
   AZURE_WEBAPP_PUBLISH_PROFILE:

   az webapp deployment list-publishing-profiles \\
     --resource-group "$RG" --name "$APP" --xml

2. Push to main: .github/workflows/backend-azure.yml deploys backend/**.
3. Point the Vercel rewrite in frontend/vercel.json at
   https://${APP}.azurewebsites.net/api/:path*.
MSG
