import { openai } from "../llm/openaiClient";

export async function embedText(text: string): Promise<number[]> {
  const model = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
  const resp = await openai.embeddings.create({ model, input: text });
  return resp.data[0].embedding;
}
