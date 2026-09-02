import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { generateGeminiJson } from "../_shared/gemini.ts";

const categories = new Set([
  "FOOD",
  "TRIPS",
  "UTILITIES",
  "KIDS_GEAR",
  "GIFTS",
  "MISCELLANEOUS",
  "MAINTENANCE",
  "UNCATEGORIZED"
]);

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const form = await request.formData();
    const file = form.get("receipt");
    if (!(file instanceof File)) {
      return jsonResponse({ error: "Upload a receipt image in the receipt field." }, 400);
    }

    const result = await generateGeminiJson(receiptPrompt(), {
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type || "image/jpeg",
      filename: file.name
    });

    return jsonResponse(normalizeReceipt(result));
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Receipt analysis failed." }, 500);
  }
});

function receiptPrompt() {
  return `Extract bill or receipt details for a family finance app.
Return JSON only with:
{
  "vendor": "string",
  "amount": number,
  "currency": "EUR unless clearly different",
  "date": "YYYY-MM-DD",
  "category": "FOOD | TRIPS | UTILITIES | KIDS_GEAR | GIFTS | MISCELLANEOUS | MAINTENANCE | UNCATEGORIZED",
  "confidence": number between 0 and 1
}
Use FOOD for groceries or supermarket receipts. Use UNCATEGORIZED when unsure.`;
}

function normalizeReceipt(input: Record<string, unknown>) {
  const category = typeof input.category === "string" && categories.has(input.category) ? input.category : "UNCATEGORIZED";
  return {
    vendor: String(input.vendor || "Unknown vendor"),
    amount: Number(input.amount || 0),
    currency: String(input.currency || "EUR"),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(input.date)) ? String(input.date) : new Date().toISOString().slice(0, 10),
    category,
    confidence: Math.max(0, Math.min(1, Number(input.confidence || 0.5))),
    provider: "GEMINI"
  };
}

