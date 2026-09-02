import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/dataStore.js";

export class ProfileService {
  constructor(private readonly store: DataStore) {}

  async create(input: { familyId: string; fullName: string; isParent: boolean }) {
    let created = null;

    await this.store.update((data) => {
      created = {
        id: randomUUID(),
        familyId: input.familyId,
        fullName: input.fullName,
        initials: makeInitials(input.fullName),
        isParent: input.isParent,
        stars: 0
      };
      data.profiles.push(created);
    });

    return created;
  }

  async update(familyId: string, profileId: string, input: { fullName?: string; isParent?: boolean }) {
    let updated = null;

    await this.store.update((data) => {
      const profile = data.profiles.find((candidate) => candidate.id === profileId && candidate.familyId === familyId);
      if (!profile) {
        throw new Error("Profile not found");
      }
      profile.fullName = input.fullName ?? profile.fullName;
      profile.initials = makeInitials(profile.fullName);
      profile.isParent = input.isParent ?? profile.isParent;
      updated = profile;
    });

    return updated;
  }
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return initials.toUpperCase();
}
