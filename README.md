# World Cup Knockouts

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Short share links require Vercel KV / Upstash Redis environment variables on Vercel.

## GitHub

```bash
git init
git add .
git commit -m "build world cup knockouts"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Vercel

Import the GitHub repo as a new Vercel project and deploy with the default Next.js settings.

## Vercel KV / Upstash Redis

Add Upstash Redis from the Vercel Marketplace to this project. Vercel will inject the required Redis/KV environment variables automatically.
