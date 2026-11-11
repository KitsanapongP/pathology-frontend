import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this script with npm run test:e2e.");
// The build and browser must agree on the public API origin; tests intercept it.
const demo = process.argv.includes("--demo");
const env = { ...process.env, NEXT_PUBLIC_API_BASE_URL: "http://api.e2e.test", NEXT_PUBLIC_AUTH_MODE: demo ? "demo" : "api" };
const testArgs = process.argv.slice(2).filter(arg => arg !== "--demo");
for (const args of [["run", "build"], ["exec", "--no", "--", "playwright", "test", ...testArgs]]) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
