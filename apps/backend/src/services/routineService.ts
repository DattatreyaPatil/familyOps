import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/dataStore.js";
import type { Weekday } from "../domain/types.js";
import { toDateString, toWeekday } from "../lib/date.js";

export class RoutineService {
  constructor(private readonly store: DataStore) {}

  async getToday(familyId: string, weekday: Weekday = toWeekday(), dateString = toDateString()) {
    const data = await this.store.read();
    const routines = data.routines.filter((routine) => routine.familyId === familyId && routine.daysOfWeek.includes(weekday));

    return routines.map((routine) => {
      const items = data.routineItems
        .filter((item) => item.routineId === routine.id)
        .map((item) => {
          const log = data.routineLogs.find(
            (entry) => entry.routineItemId === item.id && entry.dateString === dateString
          );
          return {
            ...item,
            assignee: data.profiles.find((profile) => profile.id === item.assignedToId),
            completed: Boolean(log),
            completedAt: log?.completedAt
          };
        });

      return {
        ...routine,
        requestedWeekday: weekday,
        isToday: weekday === toWeekday(),
        dateString,
        completedCount: items.filter((item) => item.completed).length,
        totalCount: items.length,
        items
      };
    });
  }

  async checkItem(routineItemId: string, dateString = toDateString()) {
    const now = new Date().toISOString();
    let created = false;
    let logId = "";

    await this.store.update((data) => {
      const existing = data.routineLogs.find(
        (entry) => entry.routineItemId === routineItemId && entry.dateString === dateString
      );

      if (existing) {
        logId = existing.id;
        return;
      }

      const item = data.routineItems.find((candidate) => candidate.id === routineItemId);
      if (!item) {
        throw new Error("Routine item not found");
      }

      logId = randomUUID();
      data.routineLogs.push({
        id: logId,
        routineItemId,
        completedAt: now,
        dateString
      });
      created = true;
    });

    return { id: logId, routineItemId, dateString, completedAt: now, created };
  }

  async uncheckItem(routineItemId: string, dateString = toDateString()) {
    await this.store.update((data) => {
      const index = data.routineLogs.findIndex(
        (entry) => entry.routineItemId === routineItemId && entry.dateString === dateString
      );
      if (index !== -1) {
        data.routineLogs.splice(index, 1);
      }
    });

    return { routineItemId, dateString, completed: false };
  }

  async toggleItem(routineItemId: string, completed: boolean, dateString = toDateString()) {
    return completed ? this.checkItem(routineItemId, dateString) : this.uncheckItem(routineItemId, dateString);
  }

  async createItem(input: { familyId: string; routineId: string; title: string; assignedToId?: string }) {
    let created = null;

    await this.store.update((data) => {
      const routine = data.routines.find((candidate) => candidate.id === input.routineId && candidate.familyId === input.familyId);
      if (!routine) {
        throw new Error("Routine not found");
      }
      if (input.assignedToId && !data.profiles.some((profile) => profile.id === input.assignedToId && profile.familyId === input.familyId)) {
        throw new Error("Assignee not found");
      }

      created = {
        id: randomUUID(),
        routineId: input.routineId,
        title: input.title,
        assignedToId: input.assignedToId || undefined
      };
      data.routineItems.push(created);
    });

    return created;
  }

  async updateItem(familyId: string, routineItemId: string, input: { title?: string; assignedToId?: string }) {
    let updated = null;

    await this.store.update((data) => {
      const item = data.routineItems.find((candidate) => candidate.id === routineItemId);
      const routine = item ? data.routines.find((candidate) => candidate.id === item.routineId) : undefined;
      if (!item || routine?.familyId !== familyId) {
        throw new Error("Routine item not found");
      }
      if (input.assignedToId && !data.profiles.some((profile) => profile.id === input.assignedToId && profile.familyId === familyId)) {
        throw new Error("Assignee not found");
      }

      item.title = input.title ?? item.title;
      item.assignedToId = input.assignedToId || undefined;
      updated = item;
    });

    return updated;
  }

  async deleteItem(familyId: string, routineItemId: string) {
    await this.store.update((data) => {
      const item = data.routineItems.find((candidate) => candidate.id === routineItemId);
      const routine = item ? data.routines.find((candidate) => candidate.id === item.routineId) : undefined;
      if (!item || routine?.familyId !== familyId) {
        throw new Error("Routine item not found");
      }
      data.routineItems = data.routineItems.filter((candidate) => candidate.id !== routineItemId);
      data.routineLogs = data.routineLogs.filter((log) => log.routineItemId !== routineItemId);
    });

    return { deleted: true, routineItemId };
  }
}
