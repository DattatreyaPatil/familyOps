const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
const geminiModel = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

export type GeminiImage = {
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
};

export async function generateGeminiJson(prompt: string, image: GeminiImage) {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured in Supabase secrets.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: image.mimeType,
                  data: base64Encode(image.bytes)
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Gemini request failed.");
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join("");

  if (!text) {
    throw new Error("Gemini did not return JSON text.");
  }

  return JSON.parse(text);
}

export async function generateGeminiText(prompt: string) {
  return generateContent([{ text: prompt }]);
}

export async function generateGeminiTextJson(prompt: string) {
  return JSON.parse(await generateContent([{ text: prompt }], true));
}

export async function analyzeYouTubeVideo(url: string, prompt: string) {
  return JSON.parse(await generateContent([{ file_data: { file_uri: url } }, { text: prompt }], true));
}

export async function generateGeminiEmbedding(content: string) {
  assertApiKey();
  const model = Deno.env.get("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-001";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiApiKey! },
      body: JSON.stringify({
        content: { parts: [{ text: content.slice(0, 12000) }] },
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: 768
      })
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message ?? "Gemini embedding request failed.");
  const values = payload.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) throw new Error("Gemini returned an invalid embedding.");
  return normalizeVector(values.map(Number));
}

async function generateContent(parts: Array<Record<string, unknown>>, json = false) {
  assertApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiApiKey! },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: json ? { responseMimeType: "application/json" } : undefined
      })
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message ?? "Gemini request failed.");
  const text = payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text).filter(Boolean).join("");
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

function assertApiKey() {
  if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured in Supabase secrets.");
}

function normalizeVector(values: number[]) {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return magnitude ? values.map((value) => value / magnitude) : values;
}

function base64Encode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
