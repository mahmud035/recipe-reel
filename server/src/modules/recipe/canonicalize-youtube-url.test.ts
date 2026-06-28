import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalizeYoutubeUrl } from "./canonicalize-youtube-url.ts";

const CLEAN = "https://www.youtube.com/watch?v=fPHxBQzaAzI";

test("strips &list= playlist param (THE proof case)", () => {
  assert.equal(
    canonicalizeYoutubeUrl(
      "https://www.youtube.com/watch?v=fPHxBQzaAzI&list=PLeGWWfn88-VM",
    ),
    CLEAN,
  );
});

test("strips youtu.be ?si= tracking param", () => {
  assert.equal(canonicalizeYoutubeUrl("https://youtu.be/fPHxBQzaAzI?si=abc123"), CLEAN);
});

test("normalizes shorts/<id>", () => {
  assert.equal(
    canonicalizeYoutubeUrl("https://www.youtube.com/shorts/fPHxBQzaAzI"),
    CLEAN,
  );
});

test("normalizes embed/<id>", () => {
  assert.equal(
    canonicalizeYoutubeUrl("https://www.youtube.com/embed/fPHxBQzaAzI"),
    CLEAN,
  );
});

test("normalizes live/<id>", () => {
  assert.equal(canonicalizeYoutubeUrl("https://www.youtube.com/live/fPHxBQzaAzI"), CLEAN);
});

test("tolerates a missing scheme (paste-without-https)", () => {
  assert.equal(canonicalizeYoutubeUrl("youtu.be/fPHxBQzaAzI"), CLEAN);
  assert.equal(canonicalizeYoutubeUrl("www.youtube.com/watch?v=fPHxBQzaAzI"), CLEAN);
});

test("strips the m. mobile host", () => {
  assert.equal(canonicalizeYoutubeUrl("https://m.youtube.com/watch?v=fPHxBQzaAzI"), CLEAN);
});

test("valid-shape but nonexistent id canonicalizes fine (fails downstream, not here)", () => {
  assert.equal(
    canonicalizeYoutubeUrl("https://www.youtube.com/watch?v=aaaaaaaaaaa"),
    "https://www.youtube.com/watch?v=aaaaaaaaaaa",
  );
});

test("rejects a channel URL (no video id)", () => {
  assert.equal(canonicalizeYoutubeUrl("https://www.youtube.com/@somechannel"), null);
});

test("rejects a non-YouTube host", () => {
  assert.equal(canonicalizeYoutubeUrl("https://www.linkedin.com/feed/"), null);
});

test("rejects garbage", () => {
  assert.equal(canonicalizeYoutubeUrl("not a url"), null);
  assert.equal(canonicalizeYoutubeUrl(""), null);
});

test("rejects a watch URL with a too-short id", () => {
  assert.equal(canonicalizeYoutubeUrl("https://www.youtube.com/watch?v=short"), null);
});
