import { toFile } from "openai/uploads";
import { openai } from "../../../../../packages/llm/openaiClient";
import { fail, ok } from "@/lib/apiError";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const blob = form.get("audio");
    if (!(blob instanceof File)) return fail("BAD_REQUEST", "audio file is required");

    if (blob.size <= 0) return fail("BAD_REQUEST", "audio file is empty", undefined, 400);
    if (blob.size > MAX_AUDIO_BYTES) {
      return fail("PAYLOAD_TOO_LARGE", `audio file exceeds ${MAX_AUDIO_BYTES} bytes limit`, { max_bytes: MAX_AUDIO_BYTES }, 413);
    }

    const mime = blob.type || "application/octet-stream";
    if (!ALLOWED_AUDIO_TYPES.has(mime)) {
      return fail("UNSUPPORTED_MEDIA_TYPE", "unsupported audio format", { allowed_types: [...ALLOWED_AUDIO_TYPES], received: mime }, 415);
    }

    const model = process.env.OPENAI_AUDIO_MODEL || "whisper-1";
    const bytes = Buffer.from(await blob.arrayBuffer());
    const file = await toFile(bytes, blob.name || "recording.webm", { type: mime });

    const tr = (await openai.audio.transcriptions.create({ file, model })) as { text?: string; language?: string };

    return ok({ transcript: tr.text ?? "", language: tr.language ?? "unknown" });
  } catch (err: unknown) {
    return fail("TRANSCRIBE_FAILED", "Failed to transcribe audio", err instanceof Error ? err.message : String(err), 500);
  }
}
