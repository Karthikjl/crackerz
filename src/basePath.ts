/**
 * Sub-folder the site is served from, e.g. "/crackerz" on GitHub Pages
 * (https://<user>.github.io/crackerz/). Empty when running locally or on a custom domain.
 * Set at build time by the deploy workflow; Next's <Link> and router add it automatically,
 * so only hand-built URLs (share links, service worker, manifest) need withBase().
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes an absolute app path ("/greeting/") with the base path. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
