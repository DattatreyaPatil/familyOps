import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppData } from "../domain/types.js";
import type { DataStore } from "./dataStore.js";
import { createPresetRewards, createPresetRoutineItems, createPresetRoutines, createSeedData } from "./seed.js";

const dataPath = join(process.cwd(), "data", "famops.local.json");

export class JsonStore implements DataStore {
  private data: AppData | null = null;

  async read(): Promise<AppData> {
    if (this.data) {
      return structuredClone(this.data);
    }

    try {
      const raw = await readFile(dataPath, "utf8");
      this.data = JSON.parse(raw) as AppData;
      this.normalize(this.data);
    } catch {
      this.data = createSeedData();
      await this.write(this.data);
    }

    return structuredClone(this.data);
  }

  private normalize(data: AppData): void {
    const fallbackAssignees = ["profile-baby-one", "profile-baby-two", "profile-mom", "profile-dad"];
    data.routineItems.forEach((item, index) => {
      if (!item.assignedToId) {
        item.assignedToId = fallbackAssignees[index % fallbackAssignees.length];
      }
    });
    data.routines.forEach((routine) => {
      routine.daysOfWeek ??= routine.id === "routine-morning" ? ["MONDAY"] : [];
    });
    createPresetRoutines().forEach((routine) => {
      if (!data.routines.some((existing) => existing.id === routine.id)) {
        data.routines.push(routine);
      }
    });
    createPresetRoutineItems().forEach((item) => {
      if (!data.routineItems.some((existing) => existing.id === item.id)) {
        data.routineItems.push(item);
      }
    });
    data.rewardDefinitions ??= createPresetRewards();
    data.monthlyBudgets ??= [];
    data.childRewardTargets ??= [];
    data.childRewardTargets.forEach((target) => {
      target.starsRequired ??= data.rewardDefinitions.find((reward) => reward.id === target.rewardId)?.starsRequired ?? 1;
      target.starsEarned ??= 0;
    });
    data.rewardRedemptions ??= [];
  }

  async update(mutator: (data: AppData) => void): Promise<AppData> {
    const current = await this.read();
    mutator(current);
    await this.write(current);
    this.data = current;
    return structuredClone(current);
  }

  private async write(data: AppData): Promise<void> {
    await mkdir(dirname(dataPath), { recursive: true });
    await writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");
  }
}
