/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database
  AZURE_AD_CLIENT_ID: string
  AZURE_AD_CLIENT_SECRET: string
  AZURE_AD_TENANT_ID: string
  AUTH_SECRET: string
}
