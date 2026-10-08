import { execFileSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../apps/cag-explorable/", import.meta.url));
const bundle = fileURLToPath(new URL("../apps/cag-explorable/dist/", import.meta.url));
const destination = fileURLToPath(new URL("../public/experiments/cag/", import.meta.url));

// Build independently: the homepage and experiment retain their own dependency locks.
execFileSync("pnpm", ["--dir", app, "build"], {
  stdio: "inherit",
  env: { ...process.env, VITE_BASE_PATH: "/experiments/cag/" }
});
// Replace only this generated route after a successful experiment build.
rmSync(destination, { recursive: true, force: true });
cpSync(bundle, destination, { recursive: true });
