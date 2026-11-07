# Deploying to Vercel

No custom Vercel configuration is needed (no `vercel.json`). Every page is static. The only server code is
`/api/auth/*` (sign-in, Auth.js) and `/api/progress` (progress sync), which run as Vercel Functions and use a
Neon Postgres database. Without the database and sign-in variables the app still works, signed out, as before.

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/deutsch-learner.git
git push -u origin main
```

## 2. Import in Vercel

1. Go to https://vercel.com/new and import the GitHub repository.
2. Framework preset: **Next.js** (auto-detected). Keep the default build settings.
   The build command runs `npm run validate:data` first (the `prebuild` script), so a data mistake fails the deploy.

## 3. Database, sign-in and environment variables

1. Vercel project > **Storage** > Create > **Neon** (Postgres, free plan) > connect it to the project.
   This adds `DATABASE_URL` to Production, Preview and Development.
2. Create a Google OAuth client (Google Cloud Console > APIs & Services > Credentials > OAuth client ID, type
   "Web application"). Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
   (add `http://localhost:3000/api/auth/callback/google` for local dev). GitHub works the same way
   (callback `/api/auth/callback/github`).
3. Add the variables below in Vercel > Settings > Environment Variables.
4. Locally: `vercel link`, `vercel env pull .env.local`, then `npm run db:push` once to create the tables
   (run it again after changing `lib/db/schema.ts`).

| Variable | Needed? | What it does |
| --- | --- | --- |
| `DATABASE_URL` | for accounts | Set by the Neon integration. |
| `AUTH_SECRET` | for accounts | Random string: `npx auth secret` or `openssl rand -base64 32`. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | one provider | Google sign-in. |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | optional | GitHub sign-in. |
| `NEXT_PUBLIC_SITE_URL` | optional | Public address with `https://`, for example `https://deutsch.example.org`. Use it when you add a custom domain. |

Without it the app reads the production domain that Vercel provides (`VERCEL_PROJECT_PRODUCTION_URL`) at build time.
That address ends up in the sitemap, `robots.txt`, canonical links, `hreflang` links and the social card.
On a local build, without Vercel, it is `http://localhost:3000`.

## 4. Deploy

Pushing to `main` deploys automatically. From the CLI:

```bash
npm i -g vercel
vercel link
vercel --prod
```

## 5. What the deployment contains

| Path | What |
| --- | --- |
| `/en`, `/fa`, `/de` | the app, one copy per language (`/` redirects to `/en`) |
| `/sitemap.xml` | every page in every language, with `hreflang` alternates |
| `/robots.txt` | allows everything and points at the sitemap |
| `/manifest.webmanifest`, `/icon-192.png`, `/icon-512.png`, `/icon.svg` | installable app (PWA) |
| `/<locale>/opengraph-image` | the picture shown when a link is shared |
| `/sw.js` | optional offline support (production only) |

### Offline support

`public/sw.js` is a small service worker. It is registered only in production builds. Pages that were opened once keep
working offline; static files are cached permanently (their names change with every build). To reset every visitor's
cache after a bad release, change `CACHE` at the top of `public/sw.js`. To remove offline support, delete
`components/RegisterSW.tsx` and its use in `app/[locale]/layout.tsx`.

### Where progress is stored

Everything the learner does is saved in the browser's `localStorage` (keys start with `deutsch-learner:`).
Signed-in learners also get it synced to the `progress` table, one row per store (`lib/sync.ts`): on sign-in the
newer copy of each store wins, except the review deck, which is merged card by card; after that, changes are sent
about 2 seconds after they happen. The review deck can still be exported and imported from the Review page.

## 6. Post-deploy checklist

- [ ] `/en`, `/fa` and `/de` all load; `/` redirects to `/en`.
- [ ] `/fa`: `<html dir="rtl" lang="fa">`, Vazirmatn font, layout mirrored, German words inside Persian text stay LTR.
- [ ] Open the main navigation: Learn, Practice, Dialogues & Reading open a short list; Escape closes it.
- [ ] Arcade works with mouse and with keys `1` / `2` / `3`; a wrong answer shows the rule.
- [ ] Reload the page: score and streak persist, no hydration warning in the console.
- [ ] Review: add words on `/vocabulary`, open `/review`, grade a few cards, export the deck, import it again.
- [ ] Listening (`/listen`) and Exam > Listening: with a browser that can speak German you hear audio; otherwise the
      page says so and the exam shows the texts instead.
- [ ] Search (`/search`): `maedchen`, `strasse` and a Persian word each find results.
- [ ] `/sitemap.xml` lists the real domain (not `localhost`) and `/robots.txt` points to it.
- [ ] Share a link in a chat app: the card shows the title and the picture.
- [ ] Chrome > Install app (or "Add to home screen") is offered; with the network off, a page you visited still opens.
- [ ] Sign in, practise a little, then sign in on a second browser: the same progress appears.
- [ ] Check Vercel > Logs for function errors.
