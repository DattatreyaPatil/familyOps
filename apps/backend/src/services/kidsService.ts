import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/dataStore.js";
import type { RewardCategory, RewardIconKey, RewardRedemption } from "../domain/types.js";

export class KidsService {
  constructor(private readonly store: DataStore) {}

  async listChildren(familyId: string) {
    const data = await this.store.read();
    return data.profiles.filter((profile) => profile.familyId === familyId && !profile.isParent);
  }

  async rewardDashboard(familyId: string) {
    const data = await this.store.read();
    const children = data.profiles.filter((profile) => profile.familyId === familyId && !profile.isParent);
    const rewards = data.rewardDefinitions.filter((reward) => reward.familyId === familyId && reward.isActive);
    const targets = data.childRewardTargets.filter((target) => children.some((child) => child.id === target.profileId) && target.isActive);
    const redemptions = data.rewardRedemptions
      .filter((redemption) => children.some((child) => child.id === redemption.profileId))
      .map((redemption) => ({
        ...redemption,
        child: children.find((child) => child.id === redemption.profileId),
        reward: rewards.find((reward) => reward.id === redemption.rewardId)
      }));

    return { children, rewards, targets, redemptions };
  }

  async createReward(input: {
    familyId: string;
    title: string;
    starsRequired: number;
    category: RewardCategory;
    iconKey: RewardIconKey;
  }) {
    let reward = null;

    await this.store.update((data) => {
      reward = {
        id: randomUUID(),
        familyId: input.familyId,
        title: input.title,
        starsRequired: input.starsRequired,
        category: input.category,
        iconKey: input.iconKey,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      data.rewardDefinitions.push(reward);
    });

    return reward;
  }

  async updateReward(
    familyId: string,
    rewardId: string,
    input: { title?: string; starsRequired?: number; category?: RewardCategory; iconKey?: RewardIconKey }
  ) {
    let reward = null;

    await this.store.update((data) => {
      const existing = data.rewardDefinitions.find((candidate) => candidate.id === rewardId && candidate.familyId === familyId);
      if (!existing) {
        throw new Error("Reward not found");
      }
      existing.title = input.title ?? existing.title;
      existing.starsRequired = input.starsRequired ?? existing.starsRequired;
      existing.category = input.category ?? existing.category;
      existing.iconKey = input.iconKey ?? existing.iconKey;
      reward = existing;
    });

    return reward;
  }

  async deleteReward(familyId: string, rewardId: string) {
    await this.store.update((data) => {
      const reward = data.rewardDefinitions.find((candidate) => candidate.id === rewardId && candidate.familyId === familyId);
      if (!reward) {
        throw new Error("Reward not found");
      }
      reward.isActive = false;
      data.childRewardTargets.forEach((target) => {
        if (target.rewardId === rewardId) {
          target.isActive = false;
        }
      });
    });
    return { deleted: true, rewardId };
  }

  async selectTarget(profileId: string, rewardId: string) {
    let target = null;

    await this.store.update((data) => {
      const profile = data.profiles.find((candidate) => candidate.id === profileId && !candidate.isParent);
      const reward = data.rewardDefinitions.find((candidate) => candidate.id === rewardId && candidate.familyId === profile?.familyId && candidate.isActive);
      if (!profile) {
        throw new Error("Child profile not found");
      }
      if (!reward) {
        throw new Error("Reward not found");
      }
      const activeTarget = data.childRewardTargets.find(
        (candidate) => candidate.profileId === profileId && candidate.rewardId === rewardId && candidate.isActive
      );
      if (activeTarget) {
        target = activeTarget;
        return;
      }
      target = {
        id: randomUUID(),
        profileId,
        rewardId,
        starsRequired: reward.starsRequired,
        starsEarned: 0,
        selectedAt: new Date().toISOString(),
        isActive: true
      };
      data.childRewardTargets.push(target);
    });

    return target;
  }

  async updateTarget(profileId: string, rewardId: string, starsRequired: number) {
    let target = null;

    await this.store.update((data) => {
      const existing = data.childRewardTargets.find(
        (candidate) => candidate.profileId === profileId && candidate.rewardId === rewardId && candidate.isActive
      );
      if (!existing) {
        throw new Error("Reward target not found");
      }
      const hasPendingRequest = data.rewardRedemptions.some(
        (entry) => entry.profileId === profileId && entry.rewardId === rewardId && entry.status === "PENDING"
      );
      if (hasPendingRequest) {
        throw new Error("Resolve the pending reward request before changing its stars.");
      }
      existing.starsRequired = starsRequired;
      target = existing;
    });

    return target;
  }

  async removeTarget(profileId: string, rewardId: string) {
    await this.store.update((data) => {
      const target = data.childRewardTargets.find(
        (candidate) => candidate.profileId === profileId && candidate.rewardId === rewardId && candidate.isActive
      );
      if (!target) {
        throw new Error("Reward target not found");
      }
      const hasPendingRequest = data.rewardRedemptions.some(
        (entry) => entry.profileId === profileId && entry.rewardId === rewardId && entry.status === "PENDING"
      );
      if (hasPendingRequest) {
        throw new Error("Resolve the pending reward request before removing this goal.");
      }
      target.isActive = false;
    });
    return { removed: true, profileId, rewardId };
  }

  async creditTargetStar(profileId: string, rewardId: string, reason: string) {
    let target = null;

    await this.store.update((data) => {
      const profile = data.profiles.find((candidate) => candidate.id === profileId);
      if (!profile || profile.isParent) {
        throw new Error("Child profile not found");
      }
      const existing = data.childRewardTargets.find(
        (candidate) => candidate.profileId === profileId && candidate.rewardId === rewardId && candidate.isActive
      );
      if (!existing) {
        throw new Error("Reward target not found");
      }
      if (existing.starsEarned >= existing.starsRequired) {
        throw new Error("This reward is ready for approval.");
      }
      existing.starsEarned += 1;
      data.starLedger.push({
        id: randomUUID(),
        profileId,
        delta: 1,
        reason,
        createdAt: new Date().toISOString()
      });
      target = existing;
    });

    return target;
  }

  async requestRedemption(profileId: string, rewardId: string): Promise<RewardRedemption> {
    let redemption: RewardRedemption | undefined;

    await this.store.update((data) => {
      const profile = data.profiles.find((candidate) => candidate.id === profileId && !candidate.isParent);
      const reward = data.rewardDefinitions.find((candidate) => candidate.id === rewardId && candidate.isActive);
      if (!profile) {
        throw new Error("Child profile not found");
      }
      if (!reward || reward.familyId !== profile.familyId) {
        throw new Error("Reward not found");
      }
      const target = data.childRewardTargets.find(
        (candidate) => candidate.profileId === profileId && candidate.rewardId === rewardId && candidate.isActive
      );
      if (!target) {
        throw new Error("Choose this reward as a goal first.");
      }
      if (target.starsEarned < target.starsRequired) {
        throw new Error("Not enough stars for this reward.");
      }
      const existingRequest = data.rewardRedemptions.find(
        (entry) => entry.profileId === profileId && entry.rewardId === rewardId && entry.status === "PENDING"
      );
      if (existingRequest) {
        throw new Error("This reward already has a pending request.");
      }
      const newRedemption: RewardRedemption = {
        id: randomUUID(),
        profileId,
        rewardId,
        starsSpent: target.starsRequired,
        status: "PENDING",
        requestedAt: new Date().toISOString()
      };
      redemption = newRedemption;
      data.rewardRedemptions.push(newRedemption);
    });

    if (!redemption) {
      throw new Error("Could not create reward request.");
    }
    return redemption;
  }

  async approveRedemption(redemptionId: string) {
    let child = null;

    await this.store.update((data) => {
      const redemption = data.rewardRedemptions.find((entry) => entry.id === redemptionId && entry.status === "PENDING");
      if (!redemption) {
        throw new Error("Pending redemption not found");
      }
      const profile = data.profiles.find((candidate) => candidate.id === redemption.profileId);
      const target = data.childRewardTargets.find(
        (candidate) => candidate.profileId === redemption.profileId && candidate.rewardId === redemption.rewardId && candidate.isActive
      );
      if (!profile || !target || target.starsEarned < redemption.starsSpent) {
        throw new Error("Reward progress is no longer sufficient.");
      }
      target.starsEarned -= redemption.starsSpent;
      redemption.status = "APPROVED";
      redemption.resolvedAt = new Date().toISOString();
      data.starLedger.push({
        id: randomUUID(),
        profileId: profile.id,
        delta: -redemption.starsSpent,
        reason: "Reward approved",
        createdAt: redemption.resolvedAt
      });
      child = profile;
    });

    return child;
  }

  async rejectRedemption(redemptionId: string) {
    await this.store.update((data) => {
      const redemption = data.rewardRedemptions.find((entry) => entry.id === redemptionId && entry.status === "PENDING");
      if (!redemption) {
        throw new Error("Pending redemption not found");
      }
      redemption.status = "REJECTED";
      redemption.resolvedAt = new Date().toISOString();
    });

    return { rejected: true, redemptionId };
  }
}
