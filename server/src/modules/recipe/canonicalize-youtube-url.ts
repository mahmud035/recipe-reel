/**
 * Canonicalizes a YouTube URL.
 *
 * TWIN: an identical copy lives at client/src/utils/canonicalize-youtube-url.ts
 * (client and server are separate deploys, no shared module). Keep them byte-identical.
 *
 * Extracts the 11-char video id from any common URL form (watch, youtu.be, shorts,
 * live, embed) and returns a canonical watch URL, stripping playlist/tracking params
 * (list, t, si, pp, index, …) that make Gemini's server-side fetch receive HTML (a
 * playlist page) instead of the video — the root cause of the "Unsupported MIME type:
 * text/html" extraction failure. Returns null if no valid video id is present.
 *
 * A missing scheme is tolerated (prepended) so paste-without-https keeps working.
 */
export function canonicalizeYoutubeUrl(input: string): string | null {
  const ID = /^[A-Za-z0-9_-]{11}$/;
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] ?? null;
  } else if (host === "youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2] ?? null;
    else if (url.pathname.startsWith("/live/")) id = url.pathname.split("/")[2] ?? null;
    else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? null;
  }
  if (!id || !ID.test(id)) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}
