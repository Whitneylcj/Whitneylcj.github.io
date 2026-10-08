# CAG homepage entry — local review

2026-10-08. Homepage baseline: `01402ecec2064e8a3ecb5ffeff8268333289c879`, clean and synchronized with freshly fetched `origin/main`. Work is on isolated branch `codex/cag-experiment-button`; the primary checkout and production site have not been changed.

## Result

The NeurIPS 2026 CAG paper now has an **Interactive demo** button below its description. It navigates in the same tab to `/experiments/cag/`. After publication, this route will be `https://changjianliu.cn/experiments/cag/`.

The experiment source is imported from CAG P3 commit `7c7df2117fe04ca072ecc92cfbea487bed984b57` into `apps/cag-explorable/`, retaining its exact package versions and pnpm lock. Source model/UI/fixtures remain unchanged. It is a standalone static page, with no Astro hydration or shared React/Three dependency graph.

`tools/build-cag.mjs` builds CAG with `VITE_BASE_PATH=/experiments/cag/`, replaces only the generated route after successful build, then the root build proceeds with Astro. Astro copies the generated HTML, CSS, lazy 3D bundle and favicon into the combined `dist`. Generated experiment files and dependencies are ignored. The existing Pages workflow installs and verifies CAG first, then builds/uploads the combined website artifact. No additional Pages workflow is added.

Changes:

- `src/data/site.ts`: one internal button link for the CAG publication; optional button variant type.
- `src/components/ResearchEntry.astro`, `src/styles/research.css`: opt-in button appearance, existing focus behavior, minimum44px target. Other research links retain their styling.
- `apps/cag-explorable/`: independent source, unit/browser tests, offline Python reference and locked dependencies. The original source plan, reference PNG, screenshots and local reports are not imported.
- `tools/build-cag.mjs`, `package.json`: combined build plus predev preparation.
- `.github/workflows/deploy.yml`: pinned child toolchain and frozen install/typecheck/unit verification before the existing deployment action.
- `.gitignore`, `tsconfig.json`: ignore generated files and isolate child TypeScript configuration.
- `README.md`, this document: reproducible commands and release boundary.

## Checks actually run

| Check | Result |
| --- | --- |
| Child frozen install using the existing offline pnpm store | Passed;162 packages, no lock changes |
| Child TypeScript | Passed |
| Child unit tests | 163/163 passed |
| Root TypeScript `tsc --noEmit --ignoreDeprecations 6.0` | Passed |
| Existing visitor tracker and visitor map tests | 21/21 passed |
| `node tools/build-cag.mjs` + Astro production CLI build | Passed;16 Astro pages plus the standalone experiment and its assets |
| Combined production browser tests | Desktop1440×1000 and mobile390×844 passed |
| Deployment YAML parse / `git diff --check` | Passed |

The bundled local runtime supplies Node/pnpm but not npm. The production build was executed via the equivalent direct Node helper and Astro CLI commands; no claim is made that `npm run build` itself was executed locally. Standard Node/npm environments and the existing Astro action call the wired root script. The first offline install attempt used a different empty store; rerunning with `/tmp/cag-pnpm-store` succeeded. No dependency versions or root package-lock changed.

The two focused browser cases click the button from the exact NeurIPS article, verify same origin and path, real Canvas, default pooled/true actions(.2175/.68), Chinese sharing/hard refresh, browser Back, mobile scrolling, explicit3D interaction and native range controls. They assert no console/page errors and no HTTP failures. Reduced motion is enabled for screenshots. Four captures were generated and actually viewed:

- `apps/cag-explorable/screenshots/homepage-cag-entry-desktop.png`
- `apps/cag-explorable/screenshots/homepage-cag-entry-mobile.png`
- `apps/cag-explorable/screenshots/homepage-cag-experiment-desktop.png`
- `apps/cag-explorable/screenshots/homepage-cag-experiment-mobile.png`

Initial mobile article capture included the sticky header over its thumbnail; capture positioning was corrected without changing the UI. Screenshots remain local and are excluded from publication.

## Preview / reproduction

Combined preview: `http://127.0.0.1:4330/#publications`.
Direct experiment: `http://127.0.0.1:4330/experiments/cag/`.

```sh
npm install
pnpm --dir apps/cag-explorable install --frozen-lockfile
npm run build
npm run preview -- --host 127.0.0.1 --port 4330
# From apps/cag-explorable, with preview running:
CAG_TEST_URL=http://127.0.0.1:4330 CAG_HOMEPAGE_URL=http://127.0.0.1:4330 pnpm exec playwright test tests/e2e/homepage-entry.spec.ts
```

Homepage dev serves a prebuilt experiment; source edits need `npm run build:cag` or the standalone Vite dev server. The known-response teaching boundary, future Reveal isolation and lack of unconfirmed paper metrics remain intact. The 3D chunk still carries its size warning.

Not run: GitHub Actions release, live Pages route, Safari/Firefox, real mobile hardware or screen-reader checks. Local preview omits visitor collection because `PUBLIC_VISITOR_API_BASE` is not configured; workflow retains the existing production variable and visitor code. No push or deployment has occurred. Release waits for the user's confirmation under the established preview-before-publication workflow.
