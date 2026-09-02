import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AppData,
  ChildRewardTarget,
  Expense,
  Family,
  GroceryItem,
  MealPlan,
  MonthlyBudget,
  Profile,
  RewardDefinition,
  RewardRedemption,
  Routine,
  RoutineExecutionLog,
  RoutineItem,
  StarLedgerEntry,
  Task
} from "../domain/types.js";
import type { DataStore } from "./dataStore.js";
import { createSeedData, familyId as seedFamilyId } from "./seed.js";

export class SupabaseStore implements DataStore {
  private readonly supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required when DATA_STORE=supabase.");
    }
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  async ensureFamilyForUser(userId: string, userEmail?: string): Promise<string> {
    const existing = await this.select("family_memberships", "family_id", { user_id: userId });
    if (existing[0]?.family_id) {
      return existing[0].family_id as string;
    }

    const { data: family, error: familyError } = await this.supabase
      .from("families")
      .insert({
        name: userEmail ? `${userEmail.split("@")[0]}'s Family` : "My Family",
        owner_user_id: userId
      })
      .select("id")
      .single();
    if (familyError) {
      if (isUniqueViolation(familyError)) return this.findExistingFamilyForUser(userId);
      throw new Error(familyError.message);
    }

    const familyId = family.id as string;
    const { error: membershipError } = await this.supabase.from("family_memberships").insert({
      family_id: familyId,
      user_id: userId,
      role: "owner"
    });
    if (membershipError) {
      await this.supabase.from("families").delete().eq("id", familyId);
      if (isUniqueViolation(membershipError)) return this.findExistingFamilyForUser(userId);
      throw new Error(membershipError.message);
    }

    await this.seedFamily(familyId);
    return familyId;
  }

  private async findExistingFamilyForUser(userId: string): Promise<string> {
    const membership = await this.select("family_memberships", "family_id", { user_id: userId });
    if (membership[0]?.family_id) return String(membership[0].family_id);

    const families = await this.select("families", "id", { owner_user_id: userId });
    if (families[0]?.id) {
      const { error } = await this.supabase.from("family_memberships").insert({ family_id: families[0].id, user_id: userId, role: "owner" });
      if (error && !isUniqueViolation(error)) throw new Error(error.message);
      return String(families[0].id);
    }

    throw new Error("Family bootstrap is already in progress. Please retry.");
  }

  async read(): Promise<AppData> {
    const [
      families,
      profiles,
      routines,
      routineItems,
      routineLogs,
      tasks,
      mealPlans,
      groceryItems,
      expenses,
      monthlyBudgets,
      starLedger,
      rewardDefinitions,
      childRewardTargets,
      rewardRedemptions
    ] = await Promise.all([
      this.select("families"),
      this.select("profiles"),
      this.select("routines"),
      this.select("routine_items"),
      this.select("routine_execution_logs"),
      this.select("tasks"),
      this.select("meal_plans"),
      this.select("grocery_items"),
      this.select("expenses"),
      this.select("monthly_budgets"),
      this.select("star_ledger"),
      this.select("reward_definitions"),
      this.select("child_reward_targets"),
      this.select("reward_redemptions")
    ]);

    return {
      families: families.map(fromFamily),
      profiles: profiles.map(fromProfile),
      routines: routines.map(fromRoutine),
      routineItems: routineItems.map(fromRoutineItem),
      routineLogs: routineLogs.map(fromRoutineLog),
      tasks: tasks.map(fromTask),
      mealPlans: mealPlans.map(fromMealPlan),
      groceryItems: groceryItems.map(fromGroceryItem),
      expenses: expenses.map(fromExpense),
      monthlyBudgets: monthlyBudgets.map(fromMonthlyBudget),
      starLedger: starLedger.map(fromStarLedger),
      rewardDefinitions: rewardDefinitions.map(fromRewardDefinition),
      childRewardTargets: childRewardTargets.map(fromChildRewardTarget),
      rewardRedemptions: rewardRedemptions.map(fromRewardRedemption)
    };
  }

  async update(mutator: (data: AppData) => void): Promise<AppData> {
    const before = await this.read();
    const after = structuredClone(before);
    mutator(after);
    await this.persist(before, after);
    return structuredClone(after);
  }

  private async seedFamily(familyId: string) {
    const seed = remapSeedIds(createSeedData(), familyId);
    await this.upsert("profiles", seed.profiles.map(toProfile));
    await this.upsert("routines", seed.routines.map(toRoutine));
    await this.upsert("routine_items", seed.routineItems.map(toRoutineItem));
    await this.upsert("tasks", seed.tasks.map(toTask));
    await this.upsert("grocery_items", seed.groceryItems.map(toGroceryItem));
    await this.upsert("expenses", seed.expenses.map(toExpense));
    await this.upsert("reward_definitions", seed.rewardDefinitions.map(toRewardDefinition));
  }

  private async persist(before: AppData, after: AppData) {
    await this.deleteMissing("reward_redemptions", before.rewardRedemptions, after.rewardRedemptions);
    await this.deleteMissing("child_reward_targets", before.childRewardTargets, after.childRewardTargets);
    await this.deleteMissing("star_ledger", before.starLedger, after.starLedger);
    await this.deleteMissing("monthly_budgets", before.monthlyBudgets, after.monthlyBudgets);
    await this.deleteMissing("expenses", before.expenses, after.expenses);
    await this.deleteMissing("grocery_items", before.groceryItems, after.groceryItems);
    await this.deleteMissing("meal_plans", before.mealPlans, after.mealPlans);
    await this.deleteMissing("tasks", before.tasks, after.tasks);
    await this.deleteMissing("routine_execution_logs", before.routineLogs, after.routineLogs);
    await this.deleteMissing("routine_items", before.routineItems, after.routineItems);
    await this.deleteMissing("routines", before.routines, after.routines);
    await this.deleteMissing("profiles", before.profiles, after.profiles);
    await this.deleteMissing("reward_definitions", before.rewardDefinitions, after.rewardDefinitions);

    await this.upsert("profiles", after.profiles.map(toProfile));
    await this.upsert("routines", after.routines.map(toRoutine));
    await this.upsert("routine_items", after.routineItems.map(toRoutineItem));
    await this.upsert("routine_execution_logs", after.routineLogs.map(toRoutineLog));
    await this.upsert("tasks", after.tasks.map(toTask));
    await this.upsert("meal_plans", after.mealPlans.map(toMealPlan));
    await this.upsert("grocery_items", after.groceryItems.map(toGroceryItem));
    await this.upsert("expenses", after.expenses.map(toExpense));
    await this.upsert("monthly_budgets", after.monthlyBudgets.map(toMonthlyBudget));
    await this.upsert("star_ledger", after.starLedger.map(toStarLedger));
    await this.upsert("reward_definitions", after.rewardDefinitions.map(toRewardDefinition));
    await this.upsert("child_reward_targets", after.childRewardTargets.map(toChildRewardTarget));
    await this.upsert("reward_redemptions", after.rewardRedemptions.map(toRewardRedemption));
  }

  private async select(table: string, columns = "*", match?: Record<string, unknown>): Promise<Array<Record<string, unknown>>> {
    let query = this.supabase.from(table).select(columns);
    if (match) {
      query = query.match(match);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<Record<string, unknown>>;
  }

  private async insert(table: string, row: Record<string, unknown>) {
    const { error } = await this.supabase.from(table).insert(row);
    if (error) throw new Error(error.message);
  }

  private async upsert(table: string, rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) return;
    const { error } = await this.supabase.from(table).upsert(rows);
    if (error) throw new Error(error.message);
  }

  private async deleteMissing(table: string, before: Array<{ id: string }>, after: Array<{ id: string }>) {
    const afterIds = new Set(after.map((item) => item.id));
    const deleted = before.filter((item) => !afterIds.has(item.id)).map((item) => item.id);
    if (deleted.length === 0) return;
    const { error } = await this.supabase.from(table).delete().in("id", deleted);
    if (error) throw new Error(error.message);
  }
}

function remapSeedIds(data: AppData, familyId: string): AppData {
  const idMap = new Map<string, string>([[seedFamilyId, familyId]]);
  const mapId = (id: string) => {
    if (!idMap.has(id)) {
      idMap.set(id, randomUUID());
    }
    return idMap.get(id)!;
  };

  return {
    families: [{ ...data.families[0], id: familyId }],
    profiles: data.profiles.map((item) => ({ ...item, id: mapId(item.id), familyId })),
    routines: data.routines.map((item) => ({ ...item, id: mapId(item.id), familyId })),
    routineItems: data.routineItems.map((item) => ({
      ...item,
      id: mapId(item.id),
      routineId: mapId(item.routineId),
      assignedToId: item.assignedToId ? mapId(item.assignedToId) : undefined
    })),
    routineLogs: [],
    tasks: data.tasks.map((item) => ({
      ...item,
      id: mapId(item.id),
      familyId,
      assignedToId: item.assignedToId ? mapId(item.assignedToId) : undefined
    })),
    mealPlans: [],
    groceryItems: data.groceryItems.map((item) => ({ ...item, id: mapId(item.id), familyId })),
    expenses: data.expenses.map((item) => ({ ...item, id: mapId(item.id), familyId })),
    monthlyBudgets: [],
    starLedger: [],
    rewardDefinitions: data.rewardDefinitions.map((item) => ({ ...item, id: mapId(item.id), familyId })),
    childRewardTargets: [],
    rewardRedemptions: []
  };
}

function fromFamily(row: Record<string, unknown>): Family {
  return { id: String(row.id), name: String(row.name), createdAt: String(row.created_at) };
}

function fromProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    fullName: String(row.full_name),
    initials: String(row.initials),
    isParent: Boolean(row.is_parent),
    stars: Number(row.stars ?? 0)
  };
}

function toProfile(item: Profile) {
  return {
    id: item.id,
    family_id: item.familyId,
    full_name: item.fullName,
    initials: item.initials,
    is_parent: item.isParent,
    stars: item.stars
  };
}

function fromRoutine(row: Record<string, unknown>): Routine {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    title: String(row.title),
    cronSpec: String(row.cron_spec),
    daysOfWeek: (row.days_of_week ?? []) as Routine["daysOfWeek"]
  };
}

function toRoutine(item: Routine) {
  return { id: item.id, family_id: item.familyId, title: item.title, cron_spec: item.cronSpec, days_of_week: item.daysOfWeek };
}

function fromRoutineItem(row: Record<string, unknown>): RoutineItem {
  return {
    id: String(row.id),
    routineId: String(row.routine_id),
    title: String(row.title),
    assignedToId: row.assigned_to_id ? String(row.assigned_to_id) : undefined
  };
}

function toRoutineItem(item: RoutineItem) {
  return { id: item.id, routine_id: item.routineId, title: item.title, assigned_to_id: item.assignedToId ?? null };
}

function fromRoutineLog(row: Record<string, unknown>): RoutineExecutionLog {
  return {
    id: String(row.id),
    routineItemId: String(row.routine_item_id),
    completedAt: String(row.completed_at),
    dateString: String(row.date_string)
  };
}

function toRoutineLog(item: RoutineExecutionLog) {
  return { id: item.id, routine_item_id: item.routineItemId, completed_at: item.completedAt, date_string: item.dateString };
}

function fromTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    status: row.status as Task["status"],
    dueDate: row.due_date ? String(row.due_date) : undefined,
    assignedToId: row.assigned_to_id ? String(row.assigned_to_id) : undefined
  };
}

function toTask(item: Task) {
  return {
    id: item.id,
    family_id: item.familyId,
    title: item.title,
    description: item.description ?? null,
    status: item.status,
    due_date: item.dueDate ?? null,
    assigned_to_id: item.assignedToId ?? null
  };
}

function fromMealPlan(row: Record<string, unknown>): MealPlan {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    date: String(row.date),
    recipeTitle: String(row.recipe_title),
    instructions: (row.instructions ?? []) as string[]
  };
}

function toMealPlan(item: MealPlan) {
  return { id: item.id, family_id: item.familyId, date: item.date, recipe_title: item.recipeTitle, instructions: item.instructions };
}

function fromGroceryItem(row: Record<string, unknown>): GroceryItem {
  return { id: String(row.id), familyId: String(row.family_id), name: String(row.name), isBought: Boolean(row.is_bought) };
}

function toGroceryItem(item: GroceryItem) {
  return { id: item.id, family_id: item.familyId, name: item.name, is_bought: item.isBought };
}

function fromExpense(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    vendor: String(row.vendor),
    amount: Number(row.amount),
    currency: String(row.currency),
    category: row.category as Expense["category"],
    date: String(row.date),
    receiptUrl: row.receipt_url ? String(row.receipt_url) : undefined
  };
}

function toExpense(item: Expense) {
  return {
    id: item.id,
    family_id: item.familyId,
    vendor: item.vendor,
    amount: item.amount,
    currency: item.currency,
    category: item.category,
    date: item.date,
    receipt_url: item.receiptUrl ?? null
  };
}

function fromMonthlyBudget(row: Record<string, unknown>): MonthlyBudget {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    month: String(row.month),
    category: row.category as MonthlyBudget["category"],
    amount: Number(row.amount)
  };
}

function toMonthlyBudget(item: MonthlyBudget) {
  return { id: item.id, family_id: item.familyId, month: item.month, category: item.category, amount: item.amount };
}

function fromStarLedger(row: Record<string, unknown>): StarLedgerEntry {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    delta: Number(row.delta),
    reason: String(row.reason),
    createdAt: String(row.created_at)
  };
}

function toStarLedger(item: StarLedgerEntry) {
  return { id: item.id, profile_id: item.profileId, delta: item.delta, reason: item.reason, created_at: item.createdAt };
}

function fromRewardDefinition(row: Record<string, unknown>): RewardDefinition {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    title: String(row.title),
    starsRequired: Number(row.stars_required),
    category: row.category as RewardDefinition["category"],
    iconKey: row.icon_key as RewardDefinition["iconKey"],
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at)
  };
}

function toRewardDefinition(item: RewardDefinition) {
  return {
    id: item.id,
    family_id: item.familyId,
    title: item.title,
    stars_required: item.starsRequired,
    category: item.category,
    icon_key: item.iconKey,
    is_active: item.isActive,
    created_at: item.createdAt
  };
}

function fromChildRewardTarget(row: Record<string, unknown>): ChildRewardTarget {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    rewardId: String(row.reward_id),
    starsRequired: Number(row.stars_required),
    starsEarned: Number(row.stars_earned),
    selectedAt: String(row.selected_at),
    isActive: Boolean(row.is_active)
  };
}

function toChildRewardTarget(item: ChildRewardTarget) {
  return {
    id: item.id,
    profile_id: item.profileId,
    reward_id: item.rewardId,
    stars_required: item.starsRequired,
    stars_earned: item.starsEarned,
    selected_at: item.selectedAt,
    is_active: item.isActive
  };
}

function fromRewardRedemption(row: Record<string, unknown>): RewardRedemption {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    rewardId: String(row.reward_id),
    starsSpent: Number(row.stars_spent),
    status: row.status as RewardRedemption["status"],
    requestedAt: String(row.requested_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined
  };
}

function toRewardRedemption(item: RewardRedemption) {
  return {
    id: item.id,
    profile_id: item.profileId,
    reward_id: item.rewardId,
    stars_spent: item.starsSpent,
    status: item.status,
    requested_at: item.requestedAt,
    resolved_at: item.resolvedAt ?? null
  };
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key value violates unique constraint/i.test(error.message ?? "");
}
