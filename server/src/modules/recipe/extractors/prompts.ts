// Prompts ported verbatim from the validated Phase 0 spike (spike/prompts.ts).
// Structure is now enforced by responseSchema (see response-schema.ts); the JSON_SHAPE
// text below remains as a belt-and-suspenders description of intent. `source` is omitted
// from the enforced schema and stamped server-side, so the model never returns it in v1.

const JSON_SHAPE = `Return ONLY a JSON object — no markdown, no code fences, no commentary — of exactly this shape:
{
  "title": string | null,
  "servings": string | null,
  "ingredients": [
    { "name": string, "quantity": string | null }
  ],
  "steps": [ string ]
}
Rules:
- Keep all Bengali text in Bengali. Do NOT translate to English.
- "quantity" is the amount EXACTLY as given (e.g. "২ চা চামচ", "250 গ্রাম", "1 cup"). Use null if no amount is given.
- "name" is the ingredient only, WITHOUT the amount.
- "steps" is the ordered cooking method, one concise string per step.`;

export const TRANSCRIBE_PROMPT = `You are transcribing a Bangla (Bengali) cooking video.
Transcribe ONLY the spoken narration/dialogue, verbatim, in the original Bengali.
Do NOT describe visuals and do NOT read any text shown on screen.
Output only the transcript text, nothing else.`;

// Text-only extraction (v1). The model is given the transcript text and NEVER sees the
// video, so any quantity it captures was spoken aloud.
export function extractFromTextPrompt(transcript: string): string {
  return `You are extracting a structured recipe from the SPOKEN TRANSCRIPT of a Bengali cooking video.
You can ONLY use what is written in the transcript below. You cannot see the video or any on-screen text.

${JSON_SHAPE}

TRANSCRIPT:
"""
${transcript}
"""`;
}

// Multimodal extraction — DEFERRED Phase-2 fallback. Implemented behind the adapter but
// not wired into the v1 core loop. Reads on-screen amounts the transcript would miss.
export const EXTRACT_FROM_VIDEO_PROMPT = `You are extracting a structured recipe from this Bengali cooking video.
Use EVERYTHING available: the spoken narration AND any text or numbers shown on screen
(overlays, graphics, burned-in captions, ingredient cards, packaging).
Reading amounts that appear ONLY on screen is the most important part of this task — do not skip them.

${JSON_SHAPE}`;
