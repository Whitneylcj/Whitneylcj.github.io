# Changjian Liu Personal Website

Academic homepage for `Whitneylcj.github.io`, focused on Agentic RL, LLM decision making, and embodied agents. Built with Astro, typed News/Blog collections, and an optional React visitor map.

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
- `src/pages/blog/` - Blog list and long-form research note detail pages
- `src/pages/earth-demo.astro` - legacy compatibility page for the former spatial demo URL
- `src/data/site.ts` - structured profile, research, publication, experience, and honor data
- `src/data/visitorStats.ts` - fallback visitor map data and country catalog
- `src/content/news/` - MDX news entries
- `src/content/blog/` - MDX blog entries
- `src/components/AgentLoop.astro` - responsive conceptual reasoning/action/feedback illustration
- `src/components/ResearchEntry.astro` - research entries with explicit publication/submission status
- `src/styles/research.css` - current homepage design and shared visual tokens
- `src/components/` - research presentation and optional React visitor map
- `public/assets/earth/` - Earth visual assets for the homepage hero
- `workers/visitor-analytics/` - Cloudflare Workers + D1 visitor analytics API
- `.github/workflows/deploy.yml` - GitHub Pages deployment workflow

## Assets

The homepage uses the existing personal photograph. The decorative moving background reuses NASA Blue Marble: Next Generation imagery (NASA Earth Observatory), credited in the page footer. Its source collection is https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/. Animation pauses when the page is hidden, respects reduced-motion preferences, and can be paused with the footer control; it is static on phones. The research content remains focused on agentic learning and LLM decision making.

The VEGAR preview is the unmodified Figure 4, “The framework of propagation layer,” by Renjun Cao, Yong Gao, Yi Zhang, Changjian Liu, and Zhiyang Wang (2026), from [the publisher figure page](https://link.springer.com/article/10.1007/s44443-026-01048-z/figures/4). It is shared under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the research entry retains the authors, paper/figure source, and license links. Publication thumbnails open their full-size local images.

## Deployment

Push to `main`, then set GitHub Pages source to GitHub Actions in the repository settings.

To enable live visitor analytics:

1. Create a Cloudflare D1 database named `personal-website-visitors`.
2. Replace `database_id` in `workers/visitor-analytics/wrangler.toml`.
3. Run `npm run worker:migrate`.
4. Run `npm run worker:deploy`.
5. In GitHub repository settings, add an Actions variable:
   `PUBLIC_VISITOR_API_BASE=https://<worker-name>.<subdomain>.workers.dev`

If `PUBLIC_VISITOR_API_BASE` is not configured, the visitor section is omitted. If the configured API is unavailable, the map shows an unavailable state instead of fabricated traffic.

## Content maintenance

Profile, research, experience, and education live in `src/data/site.ts`. Research is grouped as `agents`, `decisions`, and `spatial`; the last group appears in an expandable bibliography that is open by default. Keep ongoing work, submissions, revisions, and publications distinct. Venue years on submissions are not publication dates.

The September 2026 refresh uses the supplied CV and the Galbot internship update. The CV itself, phone number, and private contact handles are not bundled into the public site. Local review notes and screenshots belong in ignored `reports/` directories.

## Brand assets

- `public/assets/brand/changjian-liu-logo.png` is the original supplied logo, kept byte-for-byte unchanged.
- `src/components/BrandLogo.astro` clips the outer whitespace via SVG viewports. Headers use the monogram with adjacent readable text; the footer uses the complete logo.
- `public/favicon.png` is a 64px browser rendering of the same monogram viewport on a white square, kept small for browser tabs.
- Default link previews use the supplied PNG rather than the old Earth image. Article-specific preview images still take precedence.
- White backplates preserve the original black and blue colors in both themes.
