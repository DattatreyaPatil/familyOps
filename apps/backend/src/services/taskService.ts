import { randomUUID } from "node:crypto";
import { isOverdue } from "../lib/date.js";
import type { DataStore } from "../data/dataStore.js";
import type { TaskStatus } from "../domain/types.js";

export class TaskService {
  constructor(private readonly store: DataStore) {}

  async list(familyId: string) {
    const data = await this.store.read();
    return data.tasks
      .filter((task) => task.familyId === familyId)
      .map((task) => ({
        ...task,
        assignee: data.profiles.find((profile) => profile.id === task.assignedToId),
        overdue: task.status !== "DONE" && isOverdue(task.dueDate)
      }));
  }

  async transition(taskId: string, status: TaskStatus) {
    let updated = null;

    await this.store.update((data) => {
      const task = data.tasks.find((candidate) => candidate.id === taskId);
      if (!task) {
        throw new Error("Task not found");
      }
      task.status = status;
      updated = task;
    });

    return updated;
  }

  async update(
    familyId: string,
    taskId: string,
    input: {
      title?: string;
      description?: string;
      assignedToId?: string;
      dueDate?: string;
      status?: TaskStatus;
    }
  ) {
    let updated = null;

    await this.store.update((data) => {
      const task = data.tasks.find((candidate) => candidate.id === taskId && candidate.familyId === familyId);
      if (!task) {
        throw new Error("Task not found");
      }
      if (input.assignedToId && !data.profiles.some((profile) => profile.id === input.assignedToId && profile.familyId === familyId)) {
        throw new Error("Assignee not found");
      }

      task.title = input.title ?? task.title;
      task.description = input.description ?? task.description;
      task.assignedToId = input.assignedToId || undefined;
      task.dueDate = input.dueDate || undefined;
      task.status = input.status ?? task.status;
      updated = {
        ...task,
        assignee: data.profiles.find((profile) => profile.id === task.assignedToId),
        overdue: task.status !== "DONE" && isOverdue(task.dueDate)
      };
    });

    return updated;
  }

  async create(input: {
    familyId: string;
    title: string;
    description?: string;
    assignedToId?: string;
    dueDate?: string;
    status?: TaskStatus;
  }) {
    let created = null;

    await this.store.update((data) => {
      if (input.assignedToId && !data.profiles.some((profile) => profile.id === input.assignedToId && profile.familyId === input.familyId)) {
        throw new Error("Assignee not found");
      }

      created = {
        id: randomUUID(),
        familyId: input.familyId,
        title: input.title,
        description: input.description,
        status: input.status ?? "TODO",
        dueDate: input.dueDate,
        assignedToId: input.assignedToId || undefined
      };
      data.tasks.push(created);
    });

    return created;
  }

  async delete(familyId: string, taskId: string) {
    await this.store.update((data) => {
      const index = data.tasks.findIndex((task) => task.id === taskId && task.familyId === familyId);
      if (index === -1) {
        throw new Error("Task not found");
      }
      data.tasks.splice(index, 1);
    });

    return { deleted: true, taskId };
  }
}
