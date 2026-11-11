import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
const script = resolve("scripts/sync-dev.mjs");
function git(cwd: string, ...args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Test Git operation failed: ${args.join(" ")}\n${result.stderr}`);
  return result.stdout.trim();
}
function setup() {
  const root = mkdtempSync(join(tmpdir(), "pathology-sync-test-")); roots.push(root);
  const origin = join(root, "github.git");
  const gitlab = join(root, "gitlab.git");
  const work = join(root, "work"); mkdirSync(work);
  git(root, "init", "--bare", origin); git(root, "init", "--bare", gitlab);
  git(work, "init", "--initial-branch=feature/test");
  git(work, "config", "user.name", "Synthetic Sync Test");
  git(work, "config", "user.email", "synthetic@example.test");
  git(work, "config", "commit.gpgsign", "false");
  git(work, "remote", "add", "origin", origin); git(work, "remote", "add", "gitlab", gitlab);
  let revision = 0;
  function commit() {
    writeFileSync(join(work, "synthetic.txt"), String(++revision));
    git(work, "add", "synthetic.txt"); git(work, "commit", "-m", `Synthetic task ${revision}`);
    return git(work, "rev-parse", "HEAD");
  }
  const first = commit();
  git(work, "push", "gitlab", "HEAD:refs/heads/dev");
  const run = () => spawnSync(process.execPath, [script], { cwd: work, encoding: "utf8" });
  return { root, origin, gitlab, work, first, commit, run };
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    const absolute = resolve(root);
    const insideTemp = relative(resolve(tmpdir()), absolute);
    if (!insideTemp || insideTemp.startsWith("..") || !basename(absolute).startsWith("pathology-sync-test-")) throw new Error("Refusing to remove an unexpected test directory.");
    rmSync(absolute, { recursive: true, force: true });
  }
});

it("creates GitHub dev from GitLab without publishing local unreviewed HEAD", () => {
  const s = setup(); s.commit();
  const unreviewed = git(s.work, "rev-parse", "HEAD");
  expect(s.run().status).toBe(0);
  expect(git(s.origin, "rev-parse", "refs/heads/dev")).toBe(s.first);
  expect(git(s.gitlab, "rev-parse", "refs/heads/dev")).toBe(s.first);
  expect(git(s.work, "rev-parse", "HEAD")).toBe(unreviewed);
  expect(git(s.work, "branch", "--show-current")).toBe("feature/test");
  expect(s.run().stdout).toContain("already match");
}, 20_000);

it("fast-forwards GitHub dev to the actual reviewed GitLab merge result", () => {
  const s = setup(); git(s.work, "push", "origin", "HEAD:refs/heads/dev");
  const approved = s.commit(); git(s.work, "push", "gitlab", "HEAD:refs/heads/dev");
  expect(s.run().status).toBe(0);
  expect(git(s.origin, "rev-parse", "refs/heads/dev")).toBe(approved);
  expect(git(s.origin, "for-each-ref", "--format=%(refname)", "refs/heads/main", "refs/tags")).toBe("");
}, 20_000);

it("refuses divergent GitHub changes and preserves both remote heads", () => {
  const s = setup();
  const approved = s.commit(); git(s.work, "push", "gitlab", "HEAD:refs/heads/dev");
  git(s.work, "switch", "-c", "feature/github-only", s.first);
  const independent = s.commit(); git(s.work, "push", "origin", "HEAD:refs/heads/dev");
  const result = s.run();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Merge them through a GitLab MR first");
  expect(git(s.origin, "rev-parse", "refs/heads/dev")).toBe(independent);
  expect(git(s.gitlab, "rev-parse", "refs/heads/dev")).toBe(approved);
}, 20_000);
