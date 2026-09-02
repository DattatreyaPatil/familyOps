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

function base64Encode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

