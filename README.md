# World Cup Knockouts

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Short share links require Redis/Upstash environment variables on Vercel.

This build supports these variable names:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- `STORAGE_REST_API_URL` and `STORAGE_REST_API_TOKEN`
- `STORAGE_URL` and `STORAGE_TOKEN`
- `STORAGE_KV_REST_API_URL` and `STORAGE_KV_REST_API_TOKEN`
- `STORAGE_REDIS_REST_URL` and `STORAGE_REDIS_REST_TOKEN`

## GitHub

```bash
git add .
git commit -m "fix redis share ids"
git push
```

## Vercel

After pushing, redeploy the latest production deployment.
