/** Public files need the deployment prefix when hosted under a repository path. */
export function publicAsset(path: string) {
  return path.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}` : path;
}
