# Changjian Liu Personal Website

Astro + React + Three.js homepage for `Whitneylcj.github.io`.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Structure

- `src/pages/index.astro` - homepage
- `src/pages/earth-demo.astro` - interactive spatial demo
- `src/data/site.ts` - structured profile, research, publication, experience, and honor data
- `src/components/` - React islands for canvas and Three.js experiences
- `.github/workflows/deploy.yml` - GitHub Pages deployment workflow

## Deployment

Push to `main`, then set GitHub Pages source to GitHub Actions in the repository settings.
