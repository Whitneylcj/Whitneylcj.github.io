# Changjian Liu Personal Website

Astro + React + Three.js homepage for `Whitneylcj.github.io`, with a typed News system and a privacy-preserving visitor heatmap backend.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run worker:dev
npm run worker:migrate:local
npm run worker:migrate
npm run worker:deploy
```

## Structure

- `src/pages/index.astro` - homepage
- `src/pages/news/` - News list and detail pages
- `src/pages/earth-demo.astro` - interactive spatial demo
- `src/data/site.ts` - structured profile, research, publication, experience, and honor data
- `src/data/visitorStats.ts` - fallback visitor map data and country catalog
- `src/content/news/` - MDX news entries
- `src/components/` - React islands for canvas and Three.js experiences
- `workers/visitor-analytics/` - Cloudflare Workers + D1 visitor analytics API
- `.github/workflows/deploy.yml` - GitHub Pages deployment workflow

## Deployment

Push to `main`, then set GitHub Pages source to GitHub Actions in the repository settings.

To enable live visitor analytics:

1. Create a Cloudflare D1 database named `personal-website-visitors`.
2. Replace `database_id` in `workers/visitor-analytics/wrangler.toml`.
3. Run `npm run worker:migrate`.
4. Run `npm run worker:deploy`.
5. In GitHub repository settings, add an Actions variable:
   `PUBLIC_VISITOR_API_BASE=https://<worker-name>.<subdomain>.workers.dev`

If `PUBLIC_VISITOR_API_BASE` is not configured, the site still builds and shows fallback visitor data.
