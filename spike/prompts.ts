// Prompts for the spike. The JSON shape is described in the prompt (not enforced
// via responseSchema) so the harness runs regardless of the exact SDK config field —
// run.ts/extractor.ts parse the output defensively. The production adapter can switch
// to schema-enforced output once the field name is confirmed in AI Studio.

const JSON_SHAPE = `Return ONLY a JSON object — no markdown, no code fences, no commentary — of exactly this shape:
{
  "title": string | null,
  "servings": string | null,
  "ingredients": [
    { "name": string, "quantity": string | null, "source": "spoken" | "on_screen" | "inferred" | null }
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

// Path A — text-only. The model is given the transcript text and NEVER sees the video,
// so any quantity it captures must have been spoken aloud.
export function extractFromTextPrompt(transcript: string): string {
  return `You are extracting a structured recipe from the SPOKEN TRANSCRIPT of a Bengali cooking video.
You can ONLY use what is written in the transcript below. You cannot see the video or any on-screen text.
For every ingredient that has an amount, set "source" to "spoken". Otherwise set "source" to null.

${JSON_SHAPE}

TRANSCRIPT:
"""
${transcript}
"""`;
}

// Path B — multimodal. The model watches the full video (audio + frames) and labels
// each quantity by where it came from. Quantities sourced "on_screen" are exactly the
// ones a transcript-only pipeline would lose — that count is the spike's whole point.
export const EXTRACT_FROM_VIDEO_PROMPT = `You are extracting a structured recipe from this Bengali cooking video.
Use EVERYTHING available: the spoken narration AND any text or numbers shown on screen
(overlays, graphics, burned-in captions, ingredient cards, packaging).
For every ingredient quantity, set "source" to:
- "spoken"    if the amount is said aloud in the narration,
- "on_screen" if the amount appears only as on-screen text/graphics and is NOT spoken,
- "inferred"  if you guessed it from context rather than reading or hearing it,
- null        if there is no amount at all.
Reading amounts that appear ONLY on screen is the most important part of this task — do not skip them.

${JSON_SHAPE}`;
