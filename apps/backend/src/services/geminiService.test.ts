import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiService } from "./geminiService.js";

const previousKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  if (previousKey) {
    process.env.GEMINI_API_KEY = previousKey;
  } else {
    delete process.env.GEMINI_API_KEY;
  }
  vi.unstubAllGlobals();
});

describe("GeminiService", () => {
  it("reports disabled when no key is configured", () => {
    delete process.env.GEMINI_API_KEY;
    expect(new GeminiService().status.enabled).toBe(false);
  });

  it("parses structured fridge analysis from Gemini", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        ingredients: ["tomato", "spinach"],
                        recipes: [
                          {
                            title: "Spinach Tomato Dal",
                            prepTimeMinutes: 20,
                            isKidFriendly: true,
                            ingredientsUsed: ["tomato", "spinach"],
                            missingIngredients: ["dal"],
                            stepByStepInstructions: ["Cook until soft."]
                          }
                        ],
                        confidence: 0.91
                      })
                    }
                  ]
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const result = await new GeminiService().analyzeKitchen({
      buffer: Buffer.from("image"),
      mimeType: "image/jpeg",
      filename: "fridge.jpg"
    });

    expect(result).toMatchObject({ provider: "GEMINI", source: "fridge.jpg", confidence: 0.91 });
    expect(result.recipes[0].title).toBe("Spinach Tomato Dal");
  });
});
