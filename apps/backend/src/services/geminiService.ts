import { z } from "zod";
import type { ExpenseCategory, KitchenAnalysis, ReceiptAnalysis } from "../domain/types.js";

type ImageInput = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

const expenseCategory = z.enum(["FOOD", "TRIPS", "UTILITIES", "KIDS_GEAR", "GIFTS", "MISCELLANEOUS", "MAINTENANCE", "UNCATEGORIZED"]);

const kitchenSchema = z.object({
  ingredients: z.array(z.string().min(1)).min(1),
  recipes: z.array(
    z.object({
      title: z.string().min(1),
      prepTimeMinutes: z.number().int().positive(),
      isKidFriendly: z.boolean(),
      ingredientsUsed: z.array(z.string()),
      missingIngredients: z.array(z.string()),
      stepByStepInstructions: z.array(z.string()).min(1)
    })
  ).min(1).max(5),
  confidence: z.number().min(0).max(1)
});

const receiptSchema = z.object({
  vendor: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().min(1).default("EUR"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: expenseCategory,
  confidence: z.number().min(0).max(1)
});

export class GeminiService {
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  get status() {
    return {
      provider: "GEMINI" as const,
      enabled: Boolean(this.apiKey),
      model: this.model
    };
  }

  async analyzeKitchen(image: ImageInput): Promise<KitchenAnalysis> {
    const raw = await this.generateJson(
      `Analyze this refrigerator or grocery photo for a family with young children. Return visible ingredients and 3 practical healthy recipes. Keep recipes family-friendly and include missing groceries. The JSON must contain: ingredients (string array), recipes (array of title, prepTimeMinutes integer, isKidFriendly boolean, ingredientsUsed string array, missingIngredients string array, stepByStepInstructions string array), confidence (number 0 to 1).`,
      image
    );
    const parsed = kitchenSchema.parse(raw);
    return {
      source: image.filename,
      ...parsed,
      provider: "GEMINI"
    };
  }

  async analyzeReceipt(image: ImageInput): Promise<ReceiptAnalysis> {
    const raw = await this.generateJson(
      `Extract purchase information from this receipt image. Return only JSON with vendor, amount as a number for the final total, currency, date in YYYY-MM-DD format when visible or today's date if missing, category chosen from FOOD, TRIPS, UTILITIES, KIDS_GEAR, GIFTS, MISCELLANEOUS, MAINTENANCE, UNCATEGORIZED, and confidence from 0 to 1.`,
      image
    );
    const parsed = receiptSchema.parse(raw);
    return {
      ...parsed,
      provider: "GEMINI"
    };
  }

  private async generateJson(prompt: string, image: ImageInput) {
    if (!this.apiKey) {
      throw new Error("Gemini is not configured. Add GEMINI_API_KEY to the backend environment.");
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: image.mimeType,
                    data: image.buffer.toString("base64")
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
    const payload = (await response.json()) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Gemini request failed.");
    }
    const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    if (!text) {
      throw new Error("Gemini returned no structured result.");
    }
    return JSON.parse(text) as unknown;
  }
}
