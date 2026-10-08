# CAG interactive teaching experiment

Standalone React + TypeScript + Vite application served at `/experiments/cag/`.
Source imported from the completed P3 CAG workspace commit `7c7df21` on 2026-10-08.
The source, mathematical model, UI and pinned dependency graph are unchanged.

This is an illustration on known synthetic response curves, separate from the
paper's synthetic/RDSS/Taobao results. It does not train the full CAG estimator.
Future truth is computed only after Reveal; opening a shared future URL freezes
history again and keeps truth hidden. Python is an offline reference only.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm dev
```

The homepage root `npm run build` builds this app with
`VITE_BASE_PATH=/experiments/cag/`, copies its static output into the ignored
`public/experiments/cag/`, then builds Astro. Its dependencies are isolated from
the homepage npm package; install both projects before building locally.
The standalone app's original Pages workflow is intentionally not imported:
the existing homepage workflow deploys the combined artifact.
