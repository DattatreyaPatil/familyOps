import { describe, expect, it } from "vitest";
import type { DataStore } from "../data/dataStore.js";
import { KitchenService } from "./kitchenService.js";

describe("KitchenService meal library", () => {
  it("provides a 15-day regional rotation and four meals for every kids age band", () => {
    const service = new KitchenService({} as DataStore);
    const library = service.getLibrary();

    expect(library.regionalPlan).toHaveLength(15);
    expect(new Set(library.regionalPlan.map((meal) => meal.region))).toEqual(new Set(["KARNATAKA", "ANDHRA_PRADESH"]));

    for (const ageBand of ["0-1", "1-2", "2-3", "3+"]) {
      const days = library.kidsPlan.filter((plan) => plan.ageBand === ageBand);
      expect(days).toHaveLength(15);
      expect(days[0].meals.map((meal) => meal.mealType)).toEqual(["BREAKFAST", "SNACK", "LUNCH", "DINNER"]);
    }
  });
});
