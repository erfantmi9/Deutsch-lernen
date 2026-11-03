# Deploying to Vercel

No custom Vercel configuration is needed (no `vercel.json`).

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

## 3. Environment variables

None. The app is fully static and free to run.

## 4. Deploy

Pushing to `main` deploys automatically. From the CLI:

```bash
npm i -g vercel
vercel link
vercel --prod
```

## 5. Post-deploy checklist

- [ ] `/en`, `/fa` and `/de` all load; `/` redirects to `/en`.
- [ ] `/fa`: `<html dir="rtl" lang="fa">`, Vazirmatn font, layout mirrored, German words inside Persian text stay LTR.
- [ ] Quiz works with mouse and with keys `1` / `2` / `3`; wrong answer shows the rule and a Next button; correct answer auto-advances after ~1 s.
- [ ] Reload the page: score and streak persist (localStorage), no hydration warning in the console.
- [ ] "Why?" (after a correct answer) and a wrong answer show the grammar card; "Explain simpler" swaps in the short rule.
- [ ] Ask-yourself test: `das Mädchen` explanation mentions the -chen rule beating natural gender (all three locales).
- [ ] Check Vercel → Logs for function errors.
