import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { generateGeminiJson } from "../_shared/gemini.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return jsonResponse({ error: "Upload a kitchen or fridge image in the image field." }, 400);
    }

    const result = await generateGeminiJson(kitchenPrompt(), {
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type || "image/jpeg",
      filename: file.name
    });

    return jsonResponse(normalizeKitchen(result, file.name));
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Kitchen analysis failed." }, 500);
  }
});

function kitchenPrompt() {
  return `Analyze this kitchen, fridge, pantry, or grocery image for a family with two parents and young children.
Return JSON only with:
{
  "ingredients": ["ingredient names visible or strongly implied"],
  "recipes": [
    {
      "title": "recipe title",
      "prepTimeMinutes": integer,
      "isKidFriendly": boolean,
      "ingredientsUsed": ["items from the image"],
      "missingIngredients": ["reasonable staples needed"],
      "stepByStepInstructions": ["short steps"]
    }
  ],
  "confidence": number between 0 and 1
}
Prefer healthy Indian and South Indian ideas when appropriate.`;
}

function normalizeKitchen(input: Record<string, unknown>, filename: string) {
  const recipes = Array.isArray(input.recipes) ? input.recipes : [];
  return {
    source: filename,
    ingredients: Array.isArray(input.ingredients) ? input.ingredients.map(String).filter(Boolean) : [],
    recipes: recipes.slice(0, 5).map((recipe) => {
      const item = recipe as Record<string, unknown>;
      return {
        title: String(item.title || "Quick family meal"),
        prepTimeMinutes: Math.max(1, Number(item.prepTimeMinutes || 20)),
        isKidFriendly: Boolean(item.isKidFriendly ?? true),
        ingredientsUsed: Array.isArray(item.ingredientsUsed) ? item.ingredientsUsed.map(String) : [],
        missingIngredients: Array.isArray(item.missingIngredients) ? item.missingIngredients.map(String) : [],
        stepByStepInstructions: Array.isArray(item.stepByStepInstructions) ? item.stepByStepInstructions.map(String) : []
      };
    }),
    confidence: Math.max(0, Math.min(1, Number(input.confidence || 0.5))),
    provider: "GEMINI"
  };
}

