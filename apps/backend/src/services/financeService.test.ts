import { describe, expect, it } from "vitest";
import type { DataStore } from "../data/dataStore.js";
import { createSeedData, familyId } from "../data/seed.js";
import type { AppData } from "../domain/types.js";
import { classifyVendor, FinanceService } from "./financeService.js";

function memoryStore(data: AppData): DataStore {
  return {
    async read() {
      return structuredClone(data);
    },
    async update(mutator: (current: AppData) => void) {
      mutator(data);
      return structuredClone(data);
    }
  };
}

describe("classifyVendor", () => {
  it("maps grocery stores to food", () => {
    expect(classifyVendor("REWE City")).toBe("FOOD");
    expect(classifyVendor("Aldi Sud")).toBe("FOOD");
  });

  it("maps travel vendors to trips", () => {
    expect(classifyVendor("Shell Station")).toBe("TRIPS");
  });

  it("maps gift expenses to gifts", () => {
    expect(classifyVendor("Birthday gift")).toBe("GIFTS");
  });

  it("falls back to uncategorized", () => {
    expect(classifyVendor("Mystery Shop")).toBe("UNCATEGORIZED");
  });
});

describe("FinanceService budgets", () => {
  it("filters expenses to the month and persists per-category targets", async () => {
    const data = createSeedData();
    data.expenses[0].date = "2026-05-02T10:00:00.000Z";
    data.expenses[1].date = "2026-04-02T10:00:00.000Z";
    data.expenses[2].date = "2026-05-03T10:00:00.000Z";
    const service = new FinanceService(memoryStore(data));

    await service.setBudget(familyId, "2026-05", "FOOD", 450);
    const dashboard = await service.dashboard(familyId, "2026-05");

    expect(dashboard.expenses).toHaveLength(2);
    expect(dashboard.total).toBe(122.1);
    expect(dashboard.budgets.find((budget) => budget.category === "FOOD")).toMatchObject({
      amount: 450,
      spent: 84.2,
      remaining: 365.8
    });
    expect(dashboard.budgets.find((budget) => budget.category === "GIFTS")?.amount).toBe(100);
  });
});
