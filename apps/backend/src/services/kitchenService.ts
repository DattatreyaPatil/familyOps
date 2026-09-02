import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/dataStore.js";
import type { KidsAgeBand, KidsMealOption, KidsMealPlanDay, KitchenAnalysis, KitchenLibrary, MealType, Recipe, RegionalMealPlanDay } from "../domain/types.js";
import type { GeminiService } from "./geminiService.js";

export class KitchenService {
  constructor(private readonly store: DataStore, private readonly gemini?: GeminiService) {}

  getLibrary(): KitchenLibrary {
    return {
      regionalPlan: createRegionalMealPlan(),
      kidsPlan: createKidsMealPlan(),
      feedingSafety: [
        "0-1 year meals listed here are for babies ready for complementary foods, usually from about 6 months.",
        "For babies under 12 months, avoid honey and added sugar; keep meals without added salt.",
        "Serve food in a soft, mashed or safely cut texture suited to the child's development and supervise meals."
      ]
    };
  }

  async analyzeFridge(familyId: string, image?: { buffer: Buffer; mimetype: string; originalname: string }): Promise<KitchenAnalysis & { familyId: string }> {
    if (image && this.gemini?.status.enabled) {
      return {
        ...(await this.gemini.analyzeKitchen({
          buffer: image.buffer,
          mimeType: image.mimetype,
          filename: image.originalname
        })),
        familyId
      };
    }
    const ingredients = ["eggs", "milk", "spinach", "cheddar cheese", "bananas"];
    const recipes: Recipe[] = [
      {
        title: "Spinach Cheddar Egg Cups",
        prepTimeMinutes: 22,
        isKidFriendly: true,
        ingredientsUsed: ["eggs", "spinach", "cheddar cheese"],
        missingIngredients: ["muffin liners"],
        stepByStepInstructions: [
          "Whisk eggs with chopped spinach.",
          "Fold in cheddar and pour into muffin cups.",
          "Bake until set and cool before serving."
        ]
      },
      {
        title: "Banana Milk Smoothie",
        prepTimeMinutes: 6,
        isKidFriendly: true,
        ingredientsUsed: ["bananas", "milk"],
        missingIngredients: ["oats"],
        stepByStepInstructions: [
          "Blend banana and milk.",
          "Add oats for thickness.",
          "Serve in small cups."
        ]
      },
      {
        title: "Fast Family Omelette",
        prepTimeMinutes: 12,
        isKidFriendly: true,
        ingredientsUsed: ["eggs", "cheddar cheese", "spinach"],
        missingIngredients: ["tomatoes"],
        stepByStepInstructions: [
          "Cook spinach until soft.",
          "Add beaten eggs and cheddar.",
          "Slice into toddler-friendly strips."
        ]
      }
    ];

    return {
      source: image?.originalname ?? "demo-fridge-snap.jpg",
      ingredients,
      recipes,
      confidence: 0.87,
      provider: "DEMO",
      familyId
    };
  }

  async selectRecipe(familyId: string, recipe: Recipe, date: string) {
    let mealPlanId = "";

    await this.store.update((data) => {
      mealPlanId = randomUUID();
      data.mealPlans.push({
        id: mealPlanId,
        familyId,
        date,
        recipeTitle: recipe.title,
        instructions: recipe.stepByStepInstructions
      });

      recipe.missingIngredients.forEach((name) => {
        data.groceryItems.push({
          id: randomUUID(),
          familyId,
          name,
          isBought: false
        });
      });
    });

    return { mealPlanId, addedGroceries: recipe.missingIngredients };
  }
}

function createRegionalMealPlan(): RegionalMealPlanDay[] {
  return [
    regionalDay(1, "KARNATAKA", "BREAKFAST", "Akki Rotti with Vegetable Palya", "Serve with coconut chutney", 28, ["rice flour", "carrot", "dill", "coconut"], ["curd"]),
    regionalDay(2, "ANDHRA_PRADESH", "BREAKFAST", "Pesarattu with Ginger Chutney", "Green gram protein breakfast", 25, ["whole green gram", "ginger", "cumin"], ["onion"]),
    regionalDay(3, "KARNATAKA", "LUNCH", "Bisi Bele Bath", "One-pot lentil rice with vegetables", 38, ["rice", "toor dal", "mixed vegetables"], ["bisi bele spice powder"]),
    regionalDay(4, "ANDHRA_PRADESH", "LUNCH", "Tomato Pappu with Rice", "Mild dal with ghee and cucumber", 30, ["toor dal", "tomato", "rice"], ["cucumber"]),
    regionalDay(5, "KARNATAKA", "DINNER", "Neer Dosa with Vegetable Saagu", "Light dosa and coconut vegetable curry", 35, ["rice batter", "mixed vegetables", "coconut"], ["cashews"]),
    regionalDay(6, "ANDHRA_PRADESH", "DINNER", "Gutti Vankaya with Jowar Roti", "Stuffed brinjal curry, family spice level", 42, ["brinjal", "peanut", "jowar flour"], ["sesame"]),
    regionalDay(7, "KARNATAKA", "LUNCH", "Ragi Mudde with Soppu Saaru", "Finger millet with greens dal", 35, ["ragi flour", "spinach", "toor dal"], ["lemon"]),
    regionalDay(8, "ANDHRA_PRADESH", "BREAKFAST", "Atukula Vegetable Upma", "Flattened rice with vegetables", 20, ["poha", "peas", "carrot"], ["peanuts"]),
    regionalDay(9, "KARNATAKA", "BREAKFAST", "Set Dosa with Vegetable Kurma", "Soft fermented dosa meal", 30, ["dosa batter", "potato", "beans"], ["coconut milk"]),
    regionalDay(10, "ANDHRA_PRADESH", "LUNCH", "Gongura Pappu with Steamed Rice", "Tangy greens lentil meal", 32, ["gongura", "toor dal", "rice"], ["ghee"]),
    regionalDay(11, "KARNATAKA", "SNACK", "Mangalore Buns with Fruit Curd", "Weekend snack plate", 32, ["banana", "whole wheat flour", "curd"], ["seasonal fruit"]),
    regionalDay(12, "ANDHRA_PRADESH", "LUNCH", "Vegetable Pulihora with Curd", "Lemon-tamarind rice with vegetables", 25, ["rice", "lemon", "carrot", "beans"], ["curd"]),
    regionalDay(13, "KARNATAKA", "DINNER", "Jolada Rotti with Ennegayi", "Jowar flatbread and stuffed brinjal", 45, ["jowar flour", "brinjal", "peanut"], ["sesame"]),
    regionalDay(14, "ANDHRA_PRADESH", "DINNER", "Ragi Sangati with Vegetable Sambar", "Rayalaseema-style millet dinner", 36, ["ragi flour", "rice", "mixed vegetables", "dal"], ["sambar powder"]),
    regionalDay(15, "KARNATAKA", "LUNCH", "Vegetable Vangi Bath with Kosambari", "Spiced brinjal rice with lentil salad", 34, ["rice", "brinjal", "moong dal", "cucumber"], ["vangi bath powder"])
  ];
}

function createKidsMealPlan(): KidsMealPlanDay[] {
  const mealOptions: KidsMealOption[] = [
    kidMeal("0-1", "BREAKFAST", "Soft Ragi Porridge", "6+ months: smooth spoonable puree; no added salt or sugar.", 12, ["ragi flour", "water"], []),
    kidMeal("0-1", "SNACK", "Mashed Steamed Banana", "6+ months: smooth mash; offer small spoon portions.", 6, ["banana"], []),
    kidMeal("0-1", "LUNCH", "Moong Dal Rice Mash", "6+ months: cook very soft and mash until lump-free.", 24, ["rice", "moong dal", "carrot"], []),
    kidMeal("0-1", "DINNER", "Soft Idli Vegetable Mash", "6+ months: crumble soft idli with warm vegetable puree.", 18, ["idli", "pumpkin"], []),
    kidMeal("1-2", "BREAKFAST", "Mini Vegetable Upma", "Soft, moist texture with finely diced cooked vegetables.", 18, ["rava", "carrot", "peas"], ["curd"]),
    kidMeal("1-2", "SNACK", "Curd Rice with Banana", "Soft spoon meal; use plain curd and mashed banana.", 8, ["curd", "rice", "banana"], []),
    kidMeal("1-2", "LUNCH", "Mild Bisi Bele Bath", "Soft-cooked rice and dal; mild spice and no hard nuts.", 28, ["rice", "toor dal", "vegetables"], []),
    kidMeal("1-2", "DINNER", "Soft Dosa Strips with Dal", "Serve soft bite-size dosa pieces dipped in dal.", 18, ["dosa batter", "moong dal"], []),
    kidMeal("2-3", "BREAKFAST", "Vegetable Pesarattu", "Small soft wedges with mild coconut chutney.", 22, ["green gram", "carrot"], ["coconut"]),
    kidMeal("2-3", "SNACK", "Ragi Banana Pancake", "Soft mini pancake without added sugar.", 16, ["ragi flour", "banana"], ["curd"]),
    kidMeal("2-3", "LUNCH", "Lemon Rice with Vegetable Dal", "Low-chilli rice paired with soft dal vegetables.", 25, ["rice", "lemon", "moong dal", "vegetables"], []),
    kidMeal("2-3", "DINNER", "Vegetable Idiyappam Bowl", "Cut strands short and serve with mild vegetable stew.", 24, ["idiyappam", "vegetables"], ["coconut milk"]),
    kidMeal("3+", "BREAKFAST", "Ragi Dosa with Sambar", "Family-style plate with mild chutney.", 24, ["ragi flour", "dal", "vegetables"], ["coconut"]),
    kidMeal("3+", "SNACK", "Sweet Potato Sundal", "Cook until soft; lightly season for children.", 16, ["sweet potato", "coconut"], ["chickpeas"]),
    kidMeal("3+", "LUNCH", "Mini Andhra Veg Thali", "Tomato pappu, rice and soft vegetable poriyal.", 30, ["rice", "toor dal", "tomato", "beans"], []),
    kidMeal("3+", "DINNER", "Akki Rotti with Palya", "Soft rotti pieces with mild vegetable side.", 25, ["rice flour", "carrot", "beans"], ["curd"])
  ];
  const ageBands: KidsAgeBand[] = ["0-1", "1-2", "2-3", "3+"];
  const mealTypes: MealType[] = ["BREAKFAST", "SNACK", "LUNCH", "DINNER"];

  return ageBands.flatMap((ageBand) =>
    Array.from({ length: 15 }, (_, index) => ({
      day: index + 1,
      ageBand,
      meals: mealTypes.map((mealType) => {
        const template = mealOptions.find((meal) => meal.ageBand === ageBand && meal.mealType === mealType);
        if (!template) {
          throw new Error("Kids meal template is missing.");
        }
        const dayNumber = index + 1;
        return {
          ...template,
          id: `${template.id}-day-${dayNumber}`,
          recipe: {
            ...template.recipe,
            title: rotateKidsRecipeTitle(template.recipe.title, mealType, dayNumber)
          }
        };
      })
    }))
  );
}

function rotateKidsRecipeTitle(title: string, mealType: MealType, day: number) {
  const additions: Record<MealType, string[]> = {
    BREAKFAST: ["", " with Banana", " with Steamed Apple", " with Carrot"],
    SNACK: ["", " with Pear", " with Curd", " with Sweet Potato"],
    LUNCH: ["", " with Spinach", " with Pumpkin", " with Beans"],
    DINNER: ["", " with Carrot", " with Bottle Gourd", " with Peas"]
  };
  return `${title}${additions[mealType][(day - 1) % additions[mealType].length]}`;
}

function regionalDay(
  day: number,
  region: RegionalMealPlanDay["region"],
  mealType: MealType,
  title: string,
  servingNote: string,
  prepTimeMinutes: number,
  ingredientsUsed: string[],
  missingIngredients: string[]
): RegionalMealPlanDay {
  return {
    day,
    region,
    mealType,
    servingNote,
    recipe: recipe(title, prepTimeMinutes, false, ingredientsUsed, missingIngredients)
  };
}

function kidMeal(
  ageBand: KidsAgeBand,
  mealType: MealType,
  title: string,
  textureNote: string,
  prepTimeMinutes: number,
  ingredientsUsed: string[],
  missingIngredients: string[]
): KidsMealOption {
  return {
    id: `${ageBand}-${mealType}`.toLowerCase().replace("+", "plus"),
    ageBand,
    mealType,
    textureNote,
    recipe: recipe(title, prepTimeMinutes, true, ingredientsUsed, missingIngredients)
  };
}

function recipe(title: string, prepTimeMinutes: number, isKidFriendly: boolean, ingredientsUsed: string[], missingIngredients: string[]): Recipe {
  return {
    title,
    prepTimeMinutes,
    isKidFriendly,
    ingredientsUsed,
    missingIngredients,
    stepByStepInstructions: [
      `Prepare ${ingredientsUsed.join(", ")} in an age-appropriate, family-friendly way.`,
      "Cook until the grains, lentils and vegetables are tender.",
      isKidFriendly ? "Cool before serving and check the texture before offering." : "Serve warm with the suggested pairing."
    ]
  };
}
