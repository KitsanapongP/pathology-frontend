import { spawnSync } from "node:child_process";

function git(args, accepted = [0]) {
  const result = spawnSync("git", args, { encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" } });
  if (result.error) throw new Error("Unable to start Git. Install Git and retry npm run git:sync-dev from the repository root.");
  if (!accepted.includes(result.status)) {
    throw new Error(`git ${args.join(" ")} failed. ${result.stderr.trim()}\nFetch both remotes and reconcile changes through a GitLab MR; do not force-push.`);
  }
  return { status: result.status, output: result.stdout.trim() };
}

try {
  git(["rev-parse", "--git-dir"]);
  git(["fetch", "--no-tags", "gitlab", "refs/heads/dev:refs/remotes/gitlab/dev"]);
  const source = git(["rev-parse", "refs/remotes/gitlab/dev"]).output;
  const target = git(["ls-remote", "--exit-code", "--heads", "origin", "refs/heads/dev"], [0, 2]);
  if (target.status === 0) {
    git(["fetch", "--no-tags", "origin", "refs/heads/dev:refs/remotes/origin/dev"]);
    const destination = git(["rev-parse", "refs/remotes/origin/dev"]).output;
    if (source === destination) {
      process.stdout.write(`GitHub dev and GitLab dev already match: ${source}\n`);
      process.exit(0);
    }
    if (git(["merge-base", "--is-ancestor", destination, source], [0, 1]).status !== 0) {
      throw new Error("GitHub dev has changes absent from GitLab dev. Merge them through a GitLab MR first, then retry npm run git:sync-dev. No branch was pushed.");
    }
  }
  git(["push", "origin", `${source}:refs/heads/dev`]);
  process.stdout.write(`Synced GitHub dev to GitLab dev: ${source}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
