import { describe, expect, it } from "vitest";
import type { DataStore } from "../data/dataStore.js";
import { createSeedData } from "../data/seed.js";
import type { AppData } from "../domain/types.js";
import { KidsService } from "./kidsService.js";

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

describe("KidsService reward targets", () => {
  it("spends a child's individually configured goal stars", async () => {
    const data = createSeedData();
    const service = new KidsService(memoryStore(data));

    await service.selectTarget("profile-baby-one", "reward-ice-cream");
    await service.selectTarget("profile-baby-one", "reward-toy-shop");
    await service.updateTarget("profile-baby-one", "reward-ice-cream", 2);
    await service.creditTargetStar("profile-baby-one", "reward-ice-cream", "Helpful");
    await service.creditTargetStar("profile-baby-one", "reward-ice-cream", "Routine complete");
    const redemption = await service.requestRedemption("profile-baby-one", "reward-ice-cream");
    const toyTarget = data.childRewardTargets.find((target) => target.rewardId === "reward-toy-shop");

    expect(redemption).toMatchObject({ starsSpent: 2, status: "PENDING" });
    expect(toyTarget?.starsEarned).toBe(0);
    await expect(service.updateTarget("profile-baby-one", "reward-ice-cream", 3)).rejects.toThrow(
      "Resolve the pending reward request before changing its stars."
    );
    await expect(service.removeTarget("profile-baby-one", "reward-ice-cream")).rejects.toThrow(
      "Resolve the pending reward request before removing this goal."
    );

    await service.approveRedemption(redemption.id);

    expect(data.childRewardTargets.find((target) => target.rewardId === "reward-ice-cream")?.starsEarned).toBe(0);
    expect(toyTarget?.starsEarned).toBe(0);
  });
});
