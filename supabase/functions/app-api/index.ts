import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
type MealType = "BREAKFAST" | "SNACK" | "LUNCH" | "DINNER";
type MealServings = { adults: number; kids: number };
type ShoppingCategory = "VEGETABLE" | "PROTEIN" | "GRAIN" | "DAIRY" | "FRUIT" | "OTHER";
type ShoppingItem = { name: string; quantity: number; unit: string; category: ShoppingCategory };
type ExpenseCategory =
  | "FOOD"
  | "TRIPS"
  | "UTILITIES"
  | "KIDS_GEAR"
  | "GIFTS"
  | "MISCELLANEOUS"
  | "MAINTENANCE"
  | "UNCATEGORIZED";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey =
  Deno.env.get("FAMOPS_SUPABASE_SECRET_KEY") ??
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const anonKey =
  Deno.env.get("FAMOPS_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  serviceRoleKey;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const authClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/app-api/, "") || "/";
    const method = request.method;

    const context = await getContext(request);
    if (method === "GET" && path === "/api/bootstrap") return jsonResponse(await bootstrap(context.familyId));
    if (method === "GET" && path === "/api/ai/status") return jsonResponse(aiStatus());
    if (method === "GET" && path === "/api/routines/today") {
      return jsonResponse(await routineDay(context.familyId, url.searchParams.get("weekday") as Weekday | null));
    }
    if (method === "POST" && path === "/api/routines/check") return jsonResponse(await toggleRoutine(context.familyId, context.user.id, await request.json()));
    if (method === "POST" && path === "/api/routines/items") return jsonResponse(await createRoutineItem(context.familyId, context.user.id, await request.json()), 201);
    if (method === "PATCH" && path.startsWith("/api/routines/items/")) {
      return jsonResponse(await updateRoutineItem(context.familyId, context.user.id, path.split("/").at(-1)!, await request.json()));
    }
    if (method === "DELETE" && path.startsWith("/api/routines/items/")) {
      return jsonResponse(await deleteRoutineItem(context.familyId, context.user.id, path.split("/").at(-1)!));
    }

    if (method === "GET" && path === "/api/tasks") return jsonResponse(await listTasks(context.familyId));
    if (method === "POST" && path === "/api/tasks") return jsonResponse(await createTask(context.familyId, await request.json()), 201);
    if (method === "PATCH" && path.match(/^\/api\/tasks\/[^/]+\/status$/)) {
      const taskId = path.split("/")[3];
      const body = await request.json();
      return jsonResponse(await updateTask(context.familyId, taskId, { status: body.status }));
    }
    if (method === "PATCH" && path.startsWith("/api/tasks/")) {
      return jsonResponse(await updateTask(context.familyId, path.split("/").at(-1)!, await request.json()));
    }
    if (method === "DELETE" && path.startsWith("/api/tasks/")) return jsonResponse(await deleteTask(context.familyId, path.split("/").at(-1)!));

    if (method === "POST" && path === "/api/profiles") return jsonResponse(await createProfile(context.familyId, await request.json()), 201);
    if (method === "PATCH" && path.startsWith("/api/profiles/")) {
      return jsonResponse(await updateProfile(context.familyId, path.split("/").at(-1)!, await request.json()));
    }

    if (method === "GET" && path === "/api/kitchen/library") return jsonResponse(kitchenLibrary());
    if (method === "POST" && path === "/api/kitchen/generate-meals") return jsonResponse(generateMeals(await request.json()));
    if (method === "GET" && path === "/api/kitchen/meal-plan") return jsonResponse(await listMealPlan(context.familyId, url.searchParams.get("startDate")));
    if (method === "POST" && path === "/api/kitchen/select-recipe") return jsonResponse(await selectRecipe(context.familyId, await request.json()), 201);
    if (method === "POST" && path === "/api/kitchen/manual-meal") return jsonResponse(await addManualMeal(context.familyId, await request.json()), 201);
    if (method === "DELETE" && path.startsWith("/api/kitchen/meal-plan/")) return jsonResponse(await deleteMealPlan(context.familyId, path.split("/").at(-1)!));
    if (method === "POST" && path === "/api/kitchen/analyze") {
      return jsonResponse({ error: "Use the analyze-kitchen Edge Function for image analysis." }, 400);
    }

    if (method === "GET" && path === "/api/friends") return jsonResponse(await friendCircle(context.familyId));
    if (method === "POST" && path === "/api/friends") return jsonResponse(await createFriend(context.familyId, await request.json()), 201);
    if (method === "PATCH" && path.match(/^\/api\/friends\/[^/]+$/)) return jsonResponse(await updateFriend(context.familyId, path.split("/").at(-1)!, await request.json()));
    if (method === "POST" && path.match(/^\/api\/friends\/[^/]+\/met$/)) {
      return jsonResponse(await markFriendMet(context.familyId, path.split("/")[3], (await request.json()).metAt));
    }
    if (method === "DELETE" && path.match(/^\/api\/friends\/[^/]+$/)) return jsonResponse(await deleteFriend(context.familyId, path.split("/").at(-1)!));

    if (method === "GET" && path === "/api/kids") return jsonResponse(await listChildren(context.familyId));
    if (method === "GET" && path === "/api/kids/rewards") return jsonResponse(await rewardDashboard(context.familyId));
    if (method === "POST" && path === "/api/kids/rewards") return jsonResponse(await createReward(context.familyId, await request.json()), 201);
    if (method === "PATCH" && path.match(/^\/api\/kids\/rewards\/[^/]+$/)) {
      return jsonResponse(await updateReward(context.familyId, path.split("/").at(-1)!, await request.json()));
    }
    if (method === "DELETE" && path.match(/^\/api\/kids\/rewards\/[^/]+$/)) {
      return jsonResponse(await softDeleteReward(context.familyId, path.split("/").at(-1)!));
    }
    if (method === "POST" && path.match(/^\/api\/kids\/[^/]+\/target$/)) {
      return jsonResponse(await selectTarget(path.split("/")[3], (await request.json()).rewardId), 201);
    }
    if (method === "PATCH" && path.match(/^\/api\/kids\/[^/]+\/target\/[^/]+$/)) {
      const parts = path.split("/");
      return jsonResponse(await updateTarget(parts[3], parts[5], Number((await request.json()).starsRequired)));
    }
    if (method === "DELETE" && path.match(/^\/api\/kids\/[^/]+\/target\/[^/]+$/)) {
      const parts = path.split("/");
      return jsonResponse(await removeTarget(parts[3], parts[5]));
    }
    if (method === "POST" && path.match(/^\/api\/kids\/[^/]+\/target\/[^/]+\/stars$/)) {
      const parts = path.split("/");
      return jsonResponse(await creditTargetStar(parts[3], parts[5], (await request.json()).reason), 201);
    }
    if (method === "POST" && path.match(/^\/api\/kids\/[^/]+\/redemptions$/)) {
      const parts = path.split("/");
      return jsonResponse(await requestRedemption(parts[3], (await request.json()).rewardId), 201);
    }
    if (method === "POST" && path.match(/^\/api\/kids\/redemptions\/[^/]+\/approve$/)) {
      return jsonResponse(await approveRedemption(path.split("/")[4]));
    }
    if (method === "POST" && path.match(/^\/api\/kids\/redemptions\/[^/]+\/reject$/)) {
      return jsonResponse(await rejectRedemption(path.split("/")[4]));
    }

    if (method === "GET" && path === "/api/finance/dashboard") {
      return jsonResponse(await financeDashboard(context.familyId, url.searchParams.get("month") ?? monthKey()));
    }
    if (method === "PUT" && path.startsWith("/api/finance/budgets/")) {
      const category = path.split("/").at(-1)! as ExpenseCategory;
      const body = await request.json();
      return jsonResponse(await saveBudget(context.familyId, body.month, category, Number(body.amount)));
    }
    if (method === "POST" && path === "/api/finance/receipt") return jsonResponse(await addReceiptJson(context.familyId, await request.json()), 201);
    if (method === "POST" && path === "/api/finance/receipt-image") return jsonResponse(await addReceiptForm(context.familyId, context.user.id, request), 201);
    if (method === "POST" && path === "/api/finance/analyze-receipt") {
      return jsonResponse({ error: "Use the analyze-receipt Edge Function for bill analysis." }, 400);
    }
    if (method === "DELETE" && path.startsWith("/api/finance/expenses/")) {
      return jsonResponse(await deleteExpense(context.familyId, path.split("/").at(-1)!));
    }

    return jsonResponse({ error: `No Edge route for ${method} ${path}` }, 404);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Request failed" }, statusFor(error));
  }
});

async function getContext(request: Request) {
  assertSupabaseConfigured();

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Missing authentication token"), { status: 401 });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error(error?.message ?? "Invalid authentication token"), { status: 401 });

  const familyId = await ensureFamilyForUser(data.user.id, data.user.email ?? undefined);
  return { user: data.user, familyId };
}

function statusFor(error: unknown) {
  return typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 400;
}

function assertSupabaseConfigured() {
  if (!supabaseUrl) {
    throw Object.assign(new Error("Edge Function is missing SUPABASE_URL."), { status: 500 });
  }
  if (!serviceRoleKey) {
    throw Object.assign(new Error("Edge Function is missing FAMOPS_SUPABASE_SECRET_KEY."), { status: 500 });
  }
}

async function ensureFamilyForUser(userId: string, email?: string) {
  const membership = await firstSingle("family_memberships", "family_id", { user_id: userId });
  if (membership?.family_id) return String(membership.family_id);

  const { data: family, error: familyError } = await admin
    .from("families")
    .insert({
      name: email ? `${email.split("@")[0]}'s Family` : "My Family",
      owner_user_id: userId
    })
    .select("id")
    .single();

  if (familyError) {
    if (isUniqueViolation(familyError)) return findExistingFamilyForUser(userId);
    throw databaseError(familyError);
  }

  const { error: membershipError } = await admin.from("family_memberships").insert({ family_id: family.id, user_id: userId, role: "owner" });
  if (membershipError) {
    await remove("families", String(family.id));
    if (isUniqueViolation(membershipError)) return findExistingFamilyForUser(userId);
    throw databaseError(membershipError);
  }

  await seedFamily(String(family.id), userId);
  await auditEvent(String(family.id), userId, "family", String(family.id), "bootstrap", { source: "first_login" });
  return String(family.id);
}

async function findExistingFamilyForUser(userId: string) {
  const membership = await firstSingle("family_memberships", "family_id", { user_id: userId });
  if (membership?.family_id) return String(membership.family_id);

  const family = await firstSingle("families", "id", { owner_user_id: userId });
  if (family?.id) {
    const { error } = await admin.from("family_memberships").insert({ family_id: family.id, user_id: userId, role: "owner" });
    if (error && !isUniqueViolation(error)) throw databaseError(error);
    return String(family.id);
  }

  throw Object.assign(new Error("Family bootstrap is already in progress. Please retry."), { status: 409 });
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key value violates unique constraint/i.test(error.message ?? "");
}

async function bootstrap(familyId: string) {
  const [family, profiles, groceries] = await Promise.all([
    maybeSingle("families", "*", { id: familyId }),
    select("profiles", "*", { family_id: familyId }),
    select("grocery_items", "*", { family_id: familyId })
  ]);
  return {
    family: family && fromFamily(family),
    profiles: profiles.map(fromProfile),
    groceries: groceries.map(fromGrocery)
  };
}

async function routineDay(familyId: string, requestedWeekday: Weekday | null) {
  const weekday = requestedWeekday ?? currentWeekday();
  const dateString = new Date().toISOString().slice(0, 10);
  const [routines, profiles] = await Promise.all([
    select("routines", "*", { family_id: familyId }),
    select("profiles", "*", { family_id: familyId })
  ]);
  const profileViews = profiles.map(fromProfile);
  const dayRoutines = routines.filter((routine) => ((routine.days_of_week as string[]) ?? []).includes(weekday));
  const output = [];
  for (const routine of dayRoutines) {
    const [items, logs] = await Promise.all([
      select("routine_items", "*", { routine_id: routine.id }),
      select("routine_execution_logs", "*")
    ]);
    const itemViews = items.map((item) => {
      const log = logs.find((entry) => entry.routine_item_id === item.id && entry.date_string === dateString);
      return {
        id: item.id,
        routineId: item.routine_id,
        title: item.title,
        assignedToId: item.assigned_to_id ?? undefined,
        assignee: profileViews.find((profile) => profile.id === item.assigned_to_id),
        completed: Boolean(log),
        completedAt: log?.completed_at
      };
    });
    output.push({
      id: routine.id,
      familyId: routine.family_id,
      title: routine.title,
      cronSpec: routine.cron_spec,
      daysOfWeek: routine.days_of_week,
      requestedWeekday: weekday,
      isToday: weekday === currentWeekday(),
      dateString,
      completedCount: itemViews.filter((item) => item.completed).length,
      totalCount: itemViews.length,
      items: itemViews
    });
  }
  return output;
}

async function toggleRoutine(familyId: string, userId: string, body: { routineItemId: string; completed?: boolean }) {
  await assertRoutineItemFamily(body.routineItemId, familyId);
  const dateString = new Date().toISOString().slice(0, 10);
  if (body.completed === false) {
    const existing = await select("routine_execution_logs", "*", { routine_item_id: body.routineItemId, date_string: dateString });
    if (existing[0]) await remove("routine_execution_logs", existing[0].id as string);
    await auditEvent(familyId, userId, "routine_item", body.routineItemId, "unchecked", { dateString });
    return { routineItemId: body.routineItemId, dateString, completed: false };
  }
  const existing = await select("routine_execution_logs", "*", { routine_item_id: body.routineItemId, date_string: dateString });
  if (existing[0]) return { ...fromRoutineLog(existing[0]), created: false };
  const created = await insertSingle("routine_execution_logs", {
    routine_item_id: body.routineItemId,
    completed_at: new Date().toISOString(),
    date_string: dateString
  });
  await auditEvent(familyId, userId, "routine_item", body.routineItemId, "checked", { dateString });
  return { ...fromRoutineLog(created), created: true };
}

async function createRoutineItem(familyId: string, userId: string, body: { routineId: string; title: string; assignedToId?: string }) {
  await assertRoutineFamily(body.routineId, familyId);
  if (body.assignedToId) await assertProfileFamily(body.assignedToId, familyId);
  const title = String(body.title ?? "").trim();
  if (!title) throw Object.assign(new Error("Routine title is required."), { status: 400 });
  const created = await insertSingle("routine_items", {
    routine_id: body.routineId,
    title,
    assigned_to_id: body.assignedToId || null,
    created_by_user_id: userId
  });
  await auditEvent(familyId, userId, "routine_item", String(created.id), "created", { routineId: body.routineId, title });
  return fromRoutineItem(created);
}

async function updateRoutineItem(familyId: string, userId: string, id: string, body: { title?: string; assignedToId?: string }) {
  const item = await maybeSingle("routine_items", "*", { id });
  if (!item) throw Object.assign(new Error("Routine item not found"), { status: 404 });
  await assertRoutineFamily(String(item.routine_id), familyId);
  if (body.assignedToId) await assertProfileFamily(body.assignedToId, familyId);
  const title = body.title === undefined ? String(item.title) : String(body.title).trim();
  if (!title) throw Object.assign(new Error("Routine title is required."), { status: 400 });
  const updated = await updateSingle("routine_items", id, {
    title,
    assigned_to_id: body.assignedToId || null
  });
  await auditEvent(familyId, userId, "routine_item", id, "updated", {
    previousTitle: item.title,
    title,
    assignedToId: body.assignedToId || null
  });
  return fromRoutineItem(updated);
}

async function deleteRoutineItem(familyId: string, userId: string, id: string) {
  const item = await maybeSingle("routine_items", "*", { id });
  if (!item) throw Object.assign(new Error("Routine item not found"), { status: 404 });
  await assertRoutineFamily(String(item.routine_id), familyId);
  await remove("routine_items", id);
  await auditEvent(familyId, userId, "routine_item", id, "deleted", { title: item.title, routineId: item.routine_id });
  return { deleted: true, routineItemId: id };
}

async function auditEvent(familyId: string, userId: string | null, entityType: string, entityId: string | null, action: string, details: Record<string, unknown> = {}) {
  const { error } = await admin.from("audit_events").insert({
    family_id: familyId,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    details,
    created_at: new Date().toISOString()
  });
  if (error && !/Could not find the table|schema cache/i.test(error.message)) throw databaseError(error);
}

async function assertRoutineFamily(routineId: string, familyId: string) {
  const routine = await maybeSingle("routines", "family_id", { id: routineId });
  if (!routine || routine.family_id !== familyId) throw Object.assign(new Error("Routine not found"), { status: 404 });
}

async function assertRoutineItemFamily(routineItemId: string, familyId: string) {
  const item = await maybeSingle("routine_items", "routine_id", { id: routineItemId });
  if (!item) throw Object.assign(new Error("Routine item not found"), { status: 404 });
  await assertRoutineFamily(String(item.routine_id), familyId);
}

async function assertProfileFamily(profileId: string, familyId: string) {
  const profile = await maybeSingle("profiles", "family_id", { id: profileId });
  if (!profile || profile.family_id !== familyId) throw Object.assign(new Error("Profile not found"), { status: 404 });
}

async function listTasks(familyId: string) {
  const [tasks, profiles] = await Promise.all([select("tasks", "*", { family_id: familyId }), select("profiles", "*", { family_id: familyId })]);
  const profileViews = profiles.map(fromProfile);
  return tasks.map((task) => ({
    ...fromTask(task),
    assignee: profileViews.find((profile) => profile.id === task.assigned_to_id),
    overdue: task.status !== "DONE" && Boolean(task.due_date) && new Date(String(task.due_date)).getTime() < Date.now()
  }));
}

async function createTask(familyId: string, body: Record<string, unknown>) {
  return fromTask(await insertSingle("tasks", toTaskRow(familyId, body)));
}

async function updateTask(familyId: string, id: string, body: Record<string, unknown>) {
  const task = await maybeSingle("tasks", "*", { id, family_id: familyId });
  if (!task) throw Object.assign(new Error("Task not found"), { status: 404 });
  const updated = await updateSingle("tasks", id, toTaskRow(familyId, { ...taskToBody(task), ...body }));
  return fromTask(updated);
}

async function deleteTask(familyId: string, id: string) {
  const task = await maybeSingle("tasks", "id", { id, family_id: familyId });
  if (!task) throw Object.assign(new Error("Task not found"), { status: 404 });
  await remove("tasks", id);
  return { deleted: true, taskId: id };
}

function toTaskRow(familyId: string, body: Record<string, unknown>) {
  return {
    family_id: familyId,
    title: String(body.title ?? ""),
    description: body.description ? String(body.description) : null,
    status: (body.status as TaskStatus | undefined) ?? "TODO",
    due_date: body.dueDate ? String(body.dueDate) : null,
    assigned_to_id: body.assignedToId ? String(body.assignedToId) : null
  };
}

function taskToBody(row: Record<string, unknown>) {
  return {
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.due_date,
    assignedToId: row.assigned_to_id
  };
}

async function createProfile(familyId: string, body: { fullName: string; isParent: boolean }) {
  const created = await insertSingle("profiles", {
    family_id: familyId,
    full_name: body.fullName,
    initials: initials(body.fullName),
    is_parent: body.isParent,
    stars: 0
  });
  return fromProfile(created);
}

async function updateProfile(familyId: string, id: string, body: { fullName?: string; isParent?: boolean }) {
  const existing = await maybeSingle("profiles", "*", { id, family_id: familyId });
  if (!existing) throw Object.assign(new Error("Profile not found"), { status: 404 });
  const fullName = body.fullName ? body.fullName : String(existing.full_name);
  return fromProfile(
    await updateSingle("profiles", id, {
      full_name: fullName,
      initials: initials(fullName),
      is_parent: body.isParent ?? existing.is_parent
    })
  );
}

async function listChildren(familyId: string) {
  return (await select("profiles", "*", { family_id: familyId, is_parent: false })).map(fromProfile);
}

async function rewardDashboard(familyId: string) {
  const children = await listChildren(familyId);
  const [rewards, targets, redemptions] = await Promise.all([
    select("reward_definitions", "*", { family_id: familyId, is_active: true }),
    select("child_reward_targets", "*", { is_active: true }),
    select("reward_redemptions", "*")
  ]);
  const childIds = new Set(children.map((child) => child.id));
  const rewardViews = rewards.map(fromReward);
  return {
    children,
    rewards: rewardViews,
    targets: targets.filter((target) => childIds.has(String(target.profile_id))).map(fromTarget),
    redemptions: redemptions
      .filter((entry) => childIds.has(String(entry.profile_id)))
      .map((entry) => ({
        ...fromRedemption(entry),
        child: children.find((child) => child.id === entry.profile_id),
        reward: rewardViews.find((reward) => reward.id === entry.reward_id)
      }))
  };
}

async function createReward(familyId: string, body: Record<string, unknown>) {
  return fromReward(
    await insertSingle("reward_definitions", {
      family_id: familyId,
      title: String(body.title),
      stars_required: Number(body.starsRequired),
      category: body.category,
      icon_key: body.iconKey,
      is_active: true,
      created_at: new Date().toISOString()
    })
  );
}

async function updateReward(familyId: string, id: string, body: Record<string, unknown>) {
  const existing = await maybeSingle("reward_definitions", "*", { id, family_id: familyId });
  if (!existing) throw Object.assign(new Error("Reward not found"), { status: 404 });
  return fromReward(
    await updateSingle("reward_definitions", id, {
      title: body.title ?? existing.title,
      stars_required: body.starsRequired ?? existing.stars_required,
      category: body.category ?? existing.category,
      icon_key: body.iconKey ?? existing.icon_key
    })
  );
}

async function softDeleteReward(familyId: string, id: string) {
  await updateReward(familyId, id, { isActive: false });
  await updateSingle("reward_definitions", id, { is_active: false });
  return { deleted: true, rewardId: id };
}

async function selectTarget(profileId: string, rewardId: string) {
  const active = await maybeSingle("child_reward_targets", "*", { profile_id: profileId, reward_id: rewardId, is_active: true });
  if (active) return fromTarget(active);
  const reward = await maybeSingle("reward_definitions", "*", { id: rewardId, is_active: true });
  if (!reward) throw Object.assign(new Error("Reward not found"), { status: 404 });
  return fromTarget(
    await insertSingle("child_reward_targets", {
      profile_id: profileId,
      reward_id: rewardId,
      stars_required: reward.stars_required,
      stars_earned: 0,
      selected_at: new Date().toISOString(),
      is_active: true
    })
  );
}

async function updateTarget(profileId: string, rewardId: string, starsRequired: number) {
  const target = await maybeSingle("child_reward_targets", "*", { profile_id: profileId, reward_id: rewardId, is_active: true });
  if (!target) throw Object.assign(new Error("Reward target not found"), { status: 404 });
  return fromTarget(await updateSingle("child_reward_targets", String(target.id), { stars_required: starsRequired }));
}

async function removeTarget(profileId: string, rewardId: string) {
  const target = await maybeSingle("child_reward_targets", "*", { profile_id: profileId, reward_id: rewardId, is_active: true });
  if (!target) throw Object.assign(new Error("Reward target not found"), { status: 404 });
  await updateSingle("child_reward_targets", String(target.id), { is_active: false });
  return { removed: true, profileId, rewardId };
}

async function creditTargetStar(profileId: string, rewardId: string, reason: string) {
  const target = await maybeSingle("child_reward_targets", "*", { profile_id: profileId, reward_id: rewardId, is_active: true });
  if (!target) throw Object.assign(new Error("Reward target not found"), { status: 404 });
  const starsEarned = Number(target.stars_earned) + 1;
  await insert("star_ledger", { profile_id: profileId, delta: 1, reason, created_at: new Date().toISOString() });
  return fromTarget(await updateSingle("child_reward_targets", String(target.id), { stars_earned: starsEarned }));
}

async function requestRedemption(profileId: string, rewardId: string) {
  const target = await maybeSingle("child_reward_targets", "*", { profile_id: profileId, reward_id: rewardId, is_active: true });
  if (!target || Number(target.stars_earned) < Number(target.stars_required)) throw new Error("Not enough stars for this reward.");
  return fromRedemption(
    await insertSingle("reward_redemptions", {
      profile_id: profileId,
      reward_id: rewardId,
      stars_spent: target.stars_required,
      status: "PENDING",
      requested_at: new Date().toISOString()
    })
  );
}

async function approveRedemption(id: string) {
  const redemption = await maybeSingle("reward_redemptions", "*", { id, status: "PENDING" });
  if (!redemption) throw Object.assign(new Error("Pending redemption not found"), { status: 404 });
  const target = await maybeSingle("child_reward_targets", "*", {
    profile_id: redemption.profile_id,
    reward_id: redemption.reward_id,
    is_active: true
  });
  if (!target) throw new Error("Reward progress is no longer sufficient.");
  await updateSingle("child_reward_targets", String(target.id), {
    stars_earned: Math.max(0, Number(target.stars_earned) - Number(redemption.stars_spent))
  });
  await updateSingle("reward_redemptions", id, { status: "APPROVED", resolved_at: new Date().toISOString() });
  return { approved: true, redemptionId: id };
}

async function rejectRedemption(id: string) {
  await updateSingle("reward_redemptions", id, { status: "REJECTED", resolved_at: new Date().toISOString() });
  return { rejected: true, redemptionId: id };
}

async function financeDashboard(familyId: string, month: string) {
  const expenses = (await select("expenses", "*", { family_id: familyId })).map(fromExpense).filter((expense) => expense.date.startsWith(month));
  const totals = Object.fromEntries(categories.map((category) => [category, 0])) as Record<ExpenseCategory, number>;
  for (const expense of expenses) totals[expense.category] += expense.amount;
  const storedBudgets = (await select("monthly_budgets", "*", { family_id: familyId, month })).map(fromBudget);
  const budgets = categories.map((category) => {
    const amount = storedBudgets.find((budget) => budget.category === category)?.amount ?? defaultBudgets[category] ?? 0;
    const spent = totals[category];
    return { category, amount, spent, remaining: amount - spent, percentage: amount > 0 ? Math.round((spent / amount) * 100) : spent > 0 ? 100 : 0 };
  });
  return { month, total: expenses.reduce((sum, expense) => sum + expense.amount, 0), totals, budgets, expenses: expenses.sort((a, b) => b.date.localeCompare(a.date)) };
}

async function saveBudget(familyId: string, month: string, category: ExpenseCategory, amount: number) {
  const existing = await maybeSingle("monthly_budgets", "*", { family_id: familyId, month, category });
  const row = { family_id: familyId, month, category, amount };
  return fromBudget(existing ? await updateSingle("monthly_budgets", String(existing.id), row) : await insertSingle("monthly_budgets", row));
}

async function addReceiptJson(familyId: string, body: Record<string, unknown>, receiptUrl?: string) {
  return fromExpense(
    await insertSingle("expenses", {
      family_id: familyId,
      vendor: String(body.vendor),
      amount: Number(body.amount),
      currency: "EUR",
      category: body.category ?? classifyVendor(String(body.vendor)),
      date: body.date ? String(body.date) : new Date().toISOString(),
      receipt_url: receiptUrl ?? null
    })
  );
}

async function addReceiptForm(familyId: string, userId: string, request: Request) {
  const form = await request.formData();
  const file = form.get("receipt");
  let receiptUrl: string | undefined;
  if (file instanceof File) {
    const storagePath = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await admin.storage.from("receipts").upload(storagePath, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error(error.message);
    receiptUrl = `supabase://receipts/${storagePath}`;
  }
  return addReceiptJson(
    familyId,
    {
      vendor: form.get("vendor"),
      amount: form.get("amount"),
      category: form.get("category") || undefined,
      date: form.get("date") || undefined
    },
    receiptUrl
  );
}

async function deleteExpense(familyId: string, id: string) {
  const expense = await maybeSingle("expenses", "id", { id, family_id: familyId });
  if (!expense) throw Object.assign(new Error("Expense not found"), { status: 404 });
  await remove("expenses", id);
  return { deleted: true, expenseId: id };
}

async function selectRecipe(familyId: string, body: Record<string, unknown>) {
  const recipe = body.recipe as {
    title: string;
    stepByStepInstructions?: string[];
    missingIngredients?: string[];
    calories?: number;
    proteinGrams?: number;
    cuisine?: string;
    servings?: MealServings;
    shoppingItems?: ShoppingItem[];
  };
  if (!recipe?.title) throw Object.assign(new Error("Recipe title is required."), { status: 400 });
  const servings = normalizeServings(recipe.servings ?? body.servings);
  const shoppingItems = normalizeShoppingItems(recipe.shoppingItems ?? buildShoppingItems(recipe.ingredientsUsed ?? [recipe.title], servings));
  const mealPlan = await insertSingle("meal_plans", {
    family_id: familyId,
    date: body.date,
    recipe_title: recipe.title,
    instructions: recipe.stepByStepInstructions ?? [],
    meal_type: normalizeMealType(body.mealType),
    audience: String(body.audience ?? "family"),
    calories: Number(recipe.calories ?? estimateCalories(recipe.title, recipe.missingIngredients ?? [])),
    protein_grams: Number(recipe.proteinGrams ?? estimateProtein(recipe.title, recipe.missingIngredients ?? [])),
    cuisine: String(recipe.cuisine ?? body.cuisine ?? "Mixed"),
    source: String(body.source ?? "picked"),
    notes: body.notes ? String(body.notes) : null,
    servings_adults: servings.adults,
    servings_kids: servings.kids,
    shopping_items: shoppingItems
  });
  for (const name of recipe.missingIngredients ?? []) {
    await insert("grocery_items", { family_id: familyId, name, is_bought: false });
  }
  return fromMealPlan(mealPlan);
}

async function listMealPlan(familyId: string, startDate: string | null) {
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(start.getTime())) throw Object.assign(new Error("Invalid meal plan start date."), { status: 400 });
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return (await select("meal_plans", "*", { family_id: familyId }))
    .map(fromMealPlan)
    .filter((meal) => meal.date >= start.toISOString() && meal.date < end.toISOString())
    .sort((a, b) => a.date.localeCompare(b.date) || mealTypeOrder(a.mealType) - mealTypeOrder(b.mealType));
}

async function addManualMeal(familyId: string, body: Record<string, unknown>) {
  const recipeTitle = String(body.recipeTitle ?? "").trim();
  if (!recipeTitle) throw Object.assign(new Error("Recipe title is required."), { status: 400 });
  return fromMealPlan(
    await insertSingle("meal_plans", {
      family_id: familyId,
      date: body.date,
      recipe_title: recipeTitle,
      instructions: body.notes ? [String(body.notes)] : [],
      meal_type: normalizeMealType(body.mealType),
      audience: String(body.audience ?? "family"),
      calories: Number(body.calories ?? estimateCalories(recipeTitle, [])),
      protein_grams: Number(body.proteinGrams ?? estimateProtein(recipeTitle, [])),
      cuisine: String(body.cuisine ?? "Manual"),
      source: "manual",
      notes: body.notes ? String(body.notes) : null,
      servings_adults: clampNumber(Number(body.servingsAdults ?? 2), 1, 12),
      servings_kids: clampNumber(Number(body.servingsKids ?? 0), 0, 12),
      shopping_items: normalizeShoppingItems(Array.isArray(body.shoppingItems) ? body.shoppingItems : [])
    })
  );
}

async function deleteMealPlan(familyId: string, id: string) {
  const meal = await maybeSingle("meal_plans", "id", { id, family_id: familyId });
  if (!meal) throw Object.assign(new Error("Meal plan entry not found"), { status: 404 });
  await remove("meal_plans", id);
  return { deleted: true, mealPlanId: id };
}

async function friendCircle(familyId: string) {
  const friends = (await select("friends", "*", { family_id: familyId, is_active: true })).map(fromFriend).sort(friendSort);
  return { friends, suggestions: buildFriendSuggestions(friends) };
}

async function createFriend(familyId: string, body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  if (!name) throw Object.assign(new Error("Friend name is required."), { status: 400 });
  const existing = await select("friends", "sort_order", { family_id: familyId, is_active: true });
  return fromFriend(
    await insertSingle("friends", {
      family_id: familyId,
      name,
      notes: body.notes ? String(body.notes) : null,
      preferred_gap_weeks: Math.max(1, Number(body.preferredGapWeeks ?? 7)),
      last_met_at: body.lastMetAt ? String(body.lastMetAt) : null,
      sort_order: existing.length
    })
  );
}

async function updateFriend(familyId: string, id: string, body: Record<string, unknown>) {
  const existing = await maybeSingle("friends", "*", { id, family_id: familyId, is_active: true });
  if (!existing) throw Object.assign(new Error("Friend not found"), { status: 404 });
  return fromFriend(
    await updateSingle("friends", id, {
      name: body.name === undefined ? existing.name : String(body.name).trim(),
      notes: body.notes === undefined ? existing.notes : String(body.notes ?? ""),
      preferred_gap_weeks: body.preferredGapWeeks === undefined ? existing.preferred_gap_weeks : Math.max(1, Number(body.preferredGapWeeks)),
      last_met_at: body.lastMetAt === undefined ? existing.last_met_at : body.lastMetAt ? String(body.lastMetAt) : null,
      sort_order: body.sortOrder === undefined ? existing.sort_order : Number(body.sortOrder)
    })
  );
}

async function markFriendMet(familyId: string, id: string, metAt?: string) {
  const existing = await maybeSingle("friends", "*", { id, family_id: familyId, is_active: true });
  if (!existing) throw Object.assign(new Error("Friend not found"), { status: 404 });
  return fromFriend(await updateSingle("friends", id, { last_met_at: metAt ? String(metAt) : new Date().toISOString() }));
}

async function deleteFriend(familyId: string, id: string) {
  const existing = await maybeSingle("friends", "id", { id, family_id: familyId, is_active: true });
  if (!existing) throw Object.assign(new Error("Friend not found"), { status: 404 });
  await updateSingle("friends", id, { is_active: false });
  return { deleted: true, friendId: id };
}

async function seedFamily(familyId: string, userId?: string) {
  const dad = crypto.randomUUID();
  const mom = crypto.randomUUID();
  const childOne = crypto.randomUUID();
  const childTwo = crypto.randomUUID();
  await bulkInsert("profiles", [
    { id: dad, family_id: familyId, full_name: "Dad", initials: "DP", is_parent: true, stars: 0 },
    { id: mom, family_id: familyId, full_name: "Mom", initials: "MP", is_parent: true, stars: 0 },
    { id: childOne, family_id: familyId, full_name: "Aarav", initials: "AR", is_parent: false, stars: 0 },
    { id: childTwo, family_id: familyId, full_name: "Mira", initials: "MI", is_parent: false, stars: 0 }
  ]);
  const routineIds: Record<string, string> = {};
  for (const day of weekdays) {
    routineIds[day] = crypto.randomUUID();
    await insert("routines", { id: routineIds[day], family_id: familyId, title: `${formatWeekday(day)} Family Routine`, cron_spec: "30 6 * * *", days_of_week: [day] });
  }
  await bulkInsert("routine_items", [
    { routine_id: routineIds.MONDAY, title: "Brush teeth", assigned_to_id: childOne, created_by_user_id: userId ?? null },
    { routine_id: routineIds.MONDAY, title: "Pack lunch bag", assigned_to_id: mom, created_by_user_id: userId ?? null },
    { routine_id: routineIds.FRIDAY, title: "Early bath time", assigned_to_id: childTwo, created_by_user_id: userId ?? null },
    { routine_id: routineIds.SUNDAY, title: "Choose next week outfits", assigned_to_id: mom, created_by_user_id: userId ?? null }
  ]);
  await bulkInsert("tasks", [
    { family_id: familyId, title: "Order diapers and wipes", description: "Check size before ordering.", status: "TODO", due_date: new Date(Date.now() + 86400000).toISOString(), assigned_to_id: dad },
    { family_id: familyId, title: "Book vaccination appointment", status: "IN_PROGRESS", due_date: new Date(Date.now() + 172800000).toISOString(), assigned_to_id: mom }
  ]);
  await bulkInsert("reward_definitions", [
    { family_id: familyId, title: "Ice cream outing", stars_required: 4, category: "TREAT", icon_key: "ICE_CREAM", is_active: true, created_at: new Date().toISOString() },
    { family_id: familyId, title: "Decathlon visit", stars_required: 8, category: "SPORT", icon_key: "SPORTS_STORE", is_active: true, created_at: new Date().toISOString() },
    { family_id: familyId, title: "Water park day", stars_required: 10, category: "OUTING", icon_key: "WATER_PARK", is_active: true, created_at: new Date().toISOString() }
  ]);
  await bulkInsert("expenses", [
    { family_id: familyId, vendor: "REWE", amount: 84.2, currency: "EUR", category: "FOOD", date: new Date().toISOString() },
    { family_id: familyId, vendor: "Daycare Supplies", amount: 37.9, currency: "EUR", category: "KIDS_GEAR", date: new Date().toISOString() }
  ]);
}

const weekdays: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const categories: ExpenseCategory[] = ["FOOD", "GIFTS", "MISCELLANEOUS", "TRIPS", "UTILITIES", "KIDS_GEAR", "MAINTENANCE", "UNCATEGORIZED"];
const defaultBudgets: Partial<Record<ExpenseCategory, number>> = { FOOD: 500, GIFTS: 100, MISCELLANEOUS: 30 };

async function select(table: string, columns = "*", match?: Record<string, unknown>) {
  let query = admin.from(table).select(columns);
  if (match) query = query.match(match);
  const { data, error } = await query;
  if (error) throw databaseError(error);
  return (data ?? []) as Record<string, unknown>[];
}

async function maybeSingle(table: string, columns = "*", match: Record<string, unknown>) {
  const { data, error } = await admin.from(table).select(columns).match(match).maybeSingle();
  if (error) throw databaseError(error);
  return data as Record<string, unknown> | null;
}

async function firstSingle(table: string, columns = "*", match: Record<string, unknown>) {
  const { data, error } = await admin.from(table).select(columns).match(match).limit(1).maybeSingle();
  if (error) throw databaseError(error);
  return data as Record<string, unknown> | null;
}

async function insert(table: string, row: Record<string, unknown>) {
  const { error } = await admin.from(table).insert(row);
  if (error) throw databaseError(error);
}

async function bulkInsert(table: string, rows: Record<string, unknown>[]) {
  const { error } = await admin.from(table).insert(rows);
  if (error) throw databaseError(error);
}

async function insertSingle(table: string, row: Record<string, unknown>) {
  const { data, error } = await admin.from(table).insert(row).select().single();
  if (error) throw databaseError(error);
  return data as Record<string, unknown>;
}

async function updateSingle(table: string, id: string, row: Record<string, unknown>) {
  const { data, error } = await admin.from(table).update(row).eq("id", id).select().single();
  if (error) throw databaseError(error);
  return data as Record<string, unknown>;
}

async function remove(table: string, id: string) {
  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) throw databaseError(error);
}

function databaseError(error: { message: string }) {
  return Object.assign(new Error(`Database error: ${error.message}`), { status: 500 });
}

function fromFamily(row: Record<string, unknown>) {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}
function fromProfile(row: Record<string, unknown>) {
  return { id: row.id, familyId: row.family_id, fullName: row.full_name, initials: row.initials, isParent: row.is_parent, stars: row.stars };
}
function fromRoutineItem(row: Record<string, unknown>) {
  return { id: row.id, routineId: row.routine_id, title: row.title, assignedToId: row.assigned_to_id ?? undefined };
}
function fromRoutineLog(row: Record<string, unknown>) {
  return { id: row.id, routineItemId: row.routine_item_id, completedAt: row.completed_at, dateString: row.date_string };
}
function fromTask(row: Record<string, unknown>) {
  return { id: row.id, familyId: row.family_id, title: row.title, description: row.description ?? undefined, status: row.status, dueDate: row.due_date ?? undefined, assignedToId: row.assigned_to_id ?? undefined };
}
function fromGrocery(row: Record<string, unknown>) {
  return { id: row.id, familyId: row.family_id, name: row.name, isBought: row.is_bought };
}
function fromMealPlan(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    date: String(row.date),
    mealType: normalizeMealType(row.meal_type),
    audience: String(row.audience ?? "family"),
    recipeTitle: String(row.recipe_title),
    instructions: (row.instructions ?? []) as string[],
    calories: Number(row.calories ?? 0),
    proteinGrams: Number(row.protein_grams ?? 0),
    cuisine: String(row.cuisine ?? "Mixed"),
    source: String(row.source ?? "picked"),
    notes: row.notes ? String(row.notes) : undefined,
    servingsAdults: Number(row.servings_adults ?? 2),
    servingsKids: Number(row.servings_kids ?? 0),
    shoppingItems: normalizeShoppingItems(Array.isArray(row.shopping_items) ? row.shopping_items : [])
  };
}
function fromExpense(row: Record<string, unknown>) {
  return { id: String(row.id), familyId: String(row.family_id), vendor: String(row.vendor), amount: Number(row.amount), currency: String(row.currency), category: row.category as ExpenseCategory, date: String(row.date), receiptUrl: row.receipt_url ? String(row.receipt_url) : undefined };
}
function fromBudget(row: Record<string, unknown>) {
  return { id: row.id, familyId: row.family_id, month: row.month, category: row.category as ExpenseCategory, amount: Number(row.amount) };
}
function fromReward(row: Record<string, unknown>) {
  return { id: row.id, familyId: row.family_id, title: row.title, starsRequired: row.stars_required, category: row.category, iconKey: row.icon_key, isActive: row.is_active, createdAt: row.created_at };
}
function fromTarget(row: Record<string, unknown>) {
  return { id: row.id, profileId: row.profile_id, rewardId: row.reward_id, starsRequired: row.stars_required, starsEarned: row.stars_earned, selectedAt: row.selected_at, isActive: row.is_active };
}
function fromRedemption(row: Record<string, unknown>) {
  return { id: row.id, profileId: row.profile_id, rewardId: row.reward_id, starsSpent: row.stars_spent, status: row.status, requestedAt: row.requested_at, resolvedAt: row.resolved_at ?? undefined };
}
function fromFriend(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    name: String(row.name),
    notes: row.notes ? String(row.notes) : undefined,
    lastMetAt: row.last_met_at ? String(row.last_met_at) : undefined,
    preferredGapWeeks: Number(row.preferred_gap_weeks ?? 7),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined
  };
}

function normalizeMealType(value: unknown): MealType {
  const candidate = String(value ?? "LUNCH").toUpperCase();
  return ["BREAKFAST", "SNACK", "LUNCH", "DINNER"].includes(candidate) ? (candidate as MealType) : "LUNCH";
}

function mealTypeOrder(value: MealType) {
  return ["BREAKFAST", "SNACK", "LUNCH", "DINNER"].indexOf(value);
}

function friendSort(a: ReturnType<typeof fromFriend>, b: ReturnType<typeof fromFriend>) {
  const aTime = a.lastMetAt ? new Date(a.lastMetAt).getTime() : 0;
  const bTime = b.lastMetAt ? new Date(b.lastMetAt).getTime() : 0;
  return aTime - bTime || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

function buildFriendSuggestions(friends: ReturnType<typeof fromFriend>[]) {
  const weekends = nextWeekendDates(8);
  return [...friends].sort(friendSort).slice(0, 8).map((friend, index) => {
    const weeksSinceMet = friend.lastMetAt ? Math.floor((Date.now() - new Date(friend.lastMetAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) : null;
    const due = weeksSinceMet === null || weeksSinceMet >= friend.preferredGapWeeks;
    const gap = weeksSinceMet === null ? "You have not logged a meetup yet" : `It has been ${weeksSinceMet} week${weeksSinceMet === 1 ? "" : "s"} since you met`;
    return {
      friend,
      weeksSinceMet,
      due,
      suggestedDate: weekends[index % weekends.length],
      message: `${gap} ${friend.name}. Maybe catch up this weekend.`
    };
  });
}

function nextWeekendDates(count: number) {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setUTCHours(10, 0, 0, 0);
  const daysUntilSaturday = (6 - cursor.getUTCDay() + 7) % 7 || 7;
  cursor.setUTCDate(cursor.getUTCDate() + daysUntilSaturday);
  for (let index = 0; index < count; index += 1) {
    const date = new Date(cursor);
    date.setUTCDate(cursor.getUTCDate() + index * 7);
    dates.push(date.toISOString());
  }
  return dates;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts.at(-1)![0]}`).toUpperCase();
}
function currentWeekday(): Weekday {
  return weekdays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
}
function formatWeekday(day: string) {
  return day[0] + day.slice(1).toLowerCase();
}
function monthKey() {
  return new Date().toISOString().slice(0, 7);
}
function classifyVendor(vendor: string): ExpenseCategory {
  const lower = vendor.toLowerCase();
  if (lower.includes("rewe") || lower.includes("aldi") || lower.includes("lidl")) return "FOOD";
  if (lower.includes("shell") || lower.includes("train") || lower.includes("taxi")) return "TRIPS";
  if (lower.includes("daycare") || lower.includes("baby") || lower.includes("dm")) return "KIDS_GEAR";
  if (lower.includes("gift") || lower.includes("present") || lower.includes("birthday")) return "GIFTS";
  return "UNCATEGORIZED";
}
function aiStatus() {
  return { provider: "GEMINI", enabled: Boolean(Deno.env.get("GEMINI_API_KEY")), model: Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash" };
}

function kitchenLibrary() {
  const regionalNames = [
    "Akki Rotti with Vegetable Palya",
    "Pesarattu with Ginger Chutney",
    "Bisi Bele Bath",
    "Tomato Pappu with Rice",
    "Neer Dosa with Vegetable Saagu",
    "Gutti Vankaya with Jowar Roti",
    "Ragi Mudde with Soppu Saaru",
    "Atukula Vegetable Upma",
    "Set Dosa with Vegetable Kurma",
    "Gongura Pappu with Steamed Rice",
    "Mangalore Buns with Fruit Curd",
    "Vegetable Pulihora with Curd",
    "Jolada Rotti with Ennegayi",
    "Ragi Sangati with Vegetable Sambar",
    "Vegetable Vangi Bath with Kosambari"
  ];
  const regionalPlan = regionalNames.map((name, index) => ({
    day: index + 1,
    region: index % 2 === 0 ? "KARNATAKA" : "ANDHRA_PRADESH",
    mealType: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"][index % 4],
    servingNote: index % 3 === 0 ? "Add curd and cucumber for a cooler family plate" : "Keep chilli moderate and serve with ghee for kids",
    recipe: recipe(name, 25 + index, ["rice", "dal", "vegetables"], index % 2 === 0 ? ["curd"] : ["coconut"])
  }));
  const kidsPlan = (["0-1", "1-2", "2-3", "3+"] as const).flatMap((ageBand) =>
    kidsMenus[ageBand].map((day, dayIndex) => ({
      day: dayIndex + 1,
      ageBand,
      meals: day.map((meal) => ({
        id: `${ageBand}-${dayIndex + 1}-${meal.mealType}`,
        ageBand,
        mealType: meal.mealType,
        textureNote: meal.note,
        recipe: recipe(meal.title, meal.prep, meal.ingredients, [])
      }))
    }))
  );
  return {
    regionalPlan,
    kidsPlan,
    feedingSafety: [
      "0-1 year meals are for babies ready for complementary foods, usually from about 6 months.",
      "For babies under 12 months, avoid honey and added sugar; keep meals without added salt.",
      "Serve safe textures and supervise meals."
    ]
  };
}

function generateMeals(body: Record<string, unknown>) {
  const ingredients = parseIngredients(String(body.ingredients ?? ""));
  const mealTypes = Array.isArray(body.mealTypes) && body.mealTypes.length ? body.mealTypes.map(String) : ["LUNCH", "DINNER"];
  const includes = Array.isArray(body.includes) ? body.includes.map(String) : [];
  const effort = String(body.effort ?? "EASY");
  const cuisine = String(body.cuisine ?? "ANY");
  const servings = normalizeServings(body.servings);
  const customIncludes = includes.filter((item) => !defaultMealIncludes.includes(item));
  const base = Array.from(new Set([...(ingredients.length ? ingredients : ["rice", "dal", "tomato", "curd"]), ...customIncludes.map((item) => item.toLowerCase())]));
  const prep = effort === "HARD" || effort === "WEEKEND" ? 50 : effort === "MEDIUM" ? 32 : 20;
  const proteins = includes.filter((item) => ["Eggs", "Chicken", "Fish", "Paneer", "Tofu", "Dal", "Chickpeas"].includes(item));
  const proteinPool = proteins.length ? proteins : customIncludes.length ? customIncludes : ["Dal"];
  const recipes = Array.from({ length: 7 }).flatMap((_, dayIndex) =>
    mealTypes.slice(0, 4).map((mealType, mealIndex) => {
      const offset = dayIndex * mealTypes.length + mealIndex;
      const protein = proteinPool[offset % proteinPool.length];
      const vegetable = includes.includes("Veggies") ? pick(base, offset + 1, "mixed vegetables") : pick(base, offset, "tomato");
      const grain = includes.includes("Oats") ? "oats" : includes.includes("Millets") ? pick(["ragi", "jowar", "little millet"], offset, "ragi") : includes.includes("Rice") ? "rice" : pick(base, offset + 2, "rice");
      const recipeCuisine = cuisine === "ANY" ? pick(["INDIAN", "ASIAN", "EUROPEAN", "MEDITERRANEAN"], offset, "INDIAN") : cuisine;
      const title = generatedTitle(mealType, protein, vegetable, grain, recipeCuisine, offset);
      return recipe(
        title,
        prep + (offset % 3) * 5,
        Array.from(new Set([grain, protein.toLowerCase(), vegetable, ...base.slice(0, 4)])),
        missingFor(protein, includes, recipeCuisine),
        recipeCuisine,
        servings
      );
    })
  );
  return {
    source: `${cuisine === "ANY" ? "Mixed cuisine" : cuisine} planner`,
    ingredients: base,
    recipes,
    confidence: 0.82,
    provider: "DEMO"
  };
}

const defaultMealIncludes = ["Rice", "Oats", "Chicken", "Fish", "Eggs", "Paneer", "Tofu", "Chickpeas", "Veggies", "Dal", "Millets", "Curd"];

function recipe(title: string, prepTimeMinutes: number, ingredientsUsed: string[], missingIngredients: string[], cuisine = "Mixed", servings: MealServings = { adults: 2, kids: 2 }) {
  return {
    title,
    prepTimeMinutes,
    isKidFriendly: true,
    ingredientsUsed,
    missingIngredients,
    stepByStepInstructions: ["Prepare ingredients.", "Cook until soft and family-friendly.", "Serve warm in age-appropriate portions."],
    calories: estimateCalories(title, ingredientsUsed),
    proteinGrams: estimateProtein(title, ingredientsUsed),
    cuisine,
    servings,
    shoppingItems: buildShoppingItems(ingredientsUsed, servings)
  };
}

function normalizeServings(value: unknown): MealServings {
  const input = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    adults: clampNumber(Number(input.adults ?? 2), 1, 12),
    kids: clampNumber(Number(input.kids ?? 0), 0, 12)
  };
}

function buildShoppingItems(ingredients: string[], servings: MealServings): ShoppingItem[] {
  const portions = Math.max(1, servings.adults + servings.kids * 0.5);
  const items = ingredients.flatMap((ingredient) => shoppingItemForIngredient(ingredient, portions));
  return normalizeShoppingItems(items);
}

function shoppingItemForIngredient(ingredient: string, portions: number): ShoppingItem[] {
  const lower = ingredient.toLowerCase();
  const add = (name: string, quantity: number, unit: string, category: ShoppingCategory) => [{ name, quantity: roundQuantity(quantity), unit, category }];
  if (isMasalaLike(lower)) return [];
  if (/egg|omelette|frittata/.test(lower)) return add("Eggs", Math.ceil(portions * 1.5), "pcs", "PROTEIN");
  if (/chicken/.test(lower)) return add("Chicken", portions * 140, "g", "PROTEIN");
  if (/fish/.test(lower)) return add("Fish", portions * 140, "g", "PROTEIN");
  if (/paneer/.test(lower)) return add("Paneer", portions * 100, "g", "PROTEIN");
  if (/tofu/.test(lower)) return add("Tofu", portions * 100, "g", "PROTEIN");
  if (/chickpea|chana/.test(lower)) return add("Chickpeas", portions * 70, "g", "PROTEIN");
  if (/dal|lentil|pappu|sambar/.test(lower)) return add("Dal", portions * 65, "g", "PROTEIN");
  if (/rice|kanji|pulao|khichdi|congee|fried rice/.test(lower)) return add("Rice", portions * 80, "g", "GRAIN");
  if (/oat/.test(lower)) return add("Oats", portions * 45, "g", "GRAIN");
  if (/ragi/.test(lower)) return add("Ragi", portions * 55, "g", "GRAIN");
  if (/jowar/.test(lower)) return add("Jowar", portions * 55, "g", "GRAIN");
  if (/millet/.test(lower)) return add("Millets", portions * 55, "g", "GRAIN");
  if (/poha|avalakki|rice flakes/.test(lower)) return add("Poha", portions * 55, "g", "GRAIN");
  if (/suji|rava/.test(lower)) return add("Suji", portions * 55, "g", "GRAIN");
  if (/curd|yogurt|raita/.test(lower)) return add("Curd", portions * 120, "g", "DAIRY");
  if (/milk/.test(lower)) return add("Milk", portions * 150, "ml", "DAIRY");
  if (/banana/.test(lower)) return add("Bananas", Math.ceil(portions), "pcs", "FRUIT");
  if (/apple/.test(lower)) return add("Apples", Math.ceil(portions), "pcs", "FRUIT");
  if (/mango/.test(lower)) return add("Mango", Math.ceil(portions), "pcs", "FRUIT");
  if (/papaya/.test(lower)) return add("Papaya", Math.ceil(portions * 0.5), "pcs", "FRUIT");
  if (/tomato/.test(lower)) return add("Tomatoes", Math.ceil(portions * 1.2), "pcs", "VEGETABLE");
  if (/onion/.test(lower)) return add("Onions", Math.ceil(portions * 0.8), "pcs", "VEGETABLE");
  if (/coriander/.test(lower)) return add("Fresh coriander", 1, "bunch", "VEGETABLE");
  if (/carrot/.test(lower)) return add("Carrots", Math.ceil(portions), "pcs", "VEGETABLE");
  if (/spinach|palak|soppu/.test(lower)) return add("Spinach", Math.ceil(portions * 100), "g", "VEGETABLE");
  if (/cucumber/.test(lower)) return add("Cucumber", Math.ceil(portions * 0.5), "pcs", "VEGETABLE");
  if (/pumpkin/.test(lower)) return add("Pumpkin", Math.ceil(portions * 120), "g", "VEGETABLE");
  if (/potato/.test(lower)) return add("Potatoes", Math.ceil(portions), "pcs", "VEGETABLE");
  if (/vegetable|veggie|beans|peas|capsicum|gourd|beetroot|corn/.test(lower)) return add("Mixed vegetables", portions * 180, "g", "VEGETABLE");
  return [];
}

function normalizeShoppingItems(items: unknown[]): ShoppingItem[] {
  const merged = new Map<string, ShoppingItem>();
  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const name = titleCase(String(item.name ?? "").trim());
    if (!name || isMasalaLike(name)) continue;
    const unit = String(item.unit ?? "pcs").trim() || "pcs";
    const category = normalizeShoppingCategory(item.category, name);
    const quantity = roundQuantity(Number(item.quantity ?? 1));
    const key = `${name.toLowerCase()}-${unit.toLowerCase()}-${category}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: roundQuantity(existing.quantity + quantity) } : { name, quantity, unit, category });
  }
  return Array.from(merged.values());
}

function normalizeShoppingCategory(value: unknown, name: string): ShoppingCategory {
  const candidate = String(value ?? "").toUpperCase();
  if (["VEGETABLE", "PROTEIN", "GRAIN", "DAIRY", "FRUIT", "OTHER"].includes(candidate)) return candidate as ShoppingCategory;
  const lower = name.toLowerCase();
  if (/chicken|fish|egg|paneer|tofu|dal|lentil|chickpea|rajma|bean/.test(lower)) return "PROTEIN";
  if (/rice|oat|ragi|jowar|millet|poha|suji|rava|wheat|pasta|noodle/.test(lower)) return "GRAIN";
  if (/curd|yogurt|milk|cheese/.test(lower)) return "DAIRY";
  if (/banana|apple|pear|mango|papaya|fruit/.test(lower)) return "FRUIT";
  if (/tomato|onion|carrot|spinach|cucumber|vegetable|coriander|potato|pumpkin|peas|beans/.test(lower)) return "VEGETABLE";
  return "OTHER";
}

function isMasalaLike(name: string) {
  return /masala|chilli|chili|turmeric|cumin|mustard|pepper|asafoetida|hing|garam|sambar powder|rasam powder/i.test(name);
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundQuantity(value: number) {
  return Math.round(value * 10) / 10;
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseIngredients(text: string) {
  return text
    .split(/[,;\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 18);
}

function pick(items: string[], index: number, fallback: string) {
  return items[index % Math.max(items.length, 1)] ?? fallback;
}

function missingFor(protein: string, includes: string[], cuisine = "INDIAN") {
  const missing = ["fresh coriander", "ginger", "curry leaves"].filter((item) => !includes.map((value) => value.toLowerCase()).includes(item));
  if (cuisine === "EUROPEAN") return ["olive oil", "herbs"].filter((item) => !includes.map((value) => value.toLowerCase()).includes(item));
  if (cuisine === "MEDITERRANEAN") return ["lemon", "yogurt", "parsley"].filter((item) => !includes.map((value) => value.toLowerCase()).includes(item)).slice(0, 2);
  if (cuisine === "ASIAN") return ["soy sauce", "spring onion"].filter((item) => !includes.map((value) => value.toLowerCase()).includes(item));
  if (protein === "Chicken") return ["lemon", ...missing.slice(0, 1)];
  if (protein === "Fish") return ["lime", ...missing.slice(0, 1)];
  if (protein === "Eggs") return ["pepper", ...missing.slice(0, 1)];
  return missing.slice(0, 2);
}

function generatedTitle(mealType: string, protein: string, vegetable: string, grain: string, cuisine: string, index: number) {
  const templates: Record<string, Record<string, string[]>> = {
    INDIAN: {
      BREAKFAST: [`${grain} ${protein} dosa with ${vegetable} chutney`, `${vegetable} uttapam with curd`, `${protein} vegetable upma`],
      SNACK: [`Mini ${vegetable} paniyaram`, `${protein} cutlet with curd dip`, `${grain} chilla rolls`],
      LUNCH: [`${protein} sambar rice with ${vegetable}`, `${vegetable} palya with ${grain} rotti`, `${protein} pulao with cucumber curd`],
      DINNER: [`Soft ${protein} khichdi with ${vegetable}`, `${grain} dosa with ${protein} curry`, `${vegetable} dal saaru with rice`]
    },
    ASIAN: {
      BREAKFAST: [`${protein} congee with ${vegetable}`, `${grain} breakfast stir fry`, `${vegetable} sesame omelette bowl`],
      SNACK: [`${vegetable} rice paper rolls`, `${protein} lettuce cups`, `${grain} sesame bites`],
      LUNCH: [`${protein} fried rice with ${vegetable}`, `${vegetable} noodle bowl`, `${protein} teriyaki ${grain} bowl`],
      DINNER: [`Ginger ${protein} broth with ${vegetable}`, `${vegetable} stir fry with ${grain}`, `${protein} coconut curry bowl`]
    },
    EUROPEAN: {
      BREAKFAST: [`Oats with ${vegetable} egg scramble`, `${protein} breakfast toast`, `${grain} porridge with yogurt`],
      SNACK: [`${vegetable} frittata bites`, `${protein} yogurt bowl`, `${grain} veggie muffins`],
      LUNCH: [`${protein} herb bowl with ${vegetable}`, `${vegetable} soup with ${grain}`, `${protein} warm salad`],
      DINNER: [`Baked ${protein} with ${vegetable}`, `${grain} risotto style family pan`, `${vegetable} stew with ${protein}`]
    },
    MEDITERRANEAN: {
      BREAKFAST: [`${grain} yogurt bowl with ${vegetable}`, `${protein} shakshuka style pan`, `${vegetable} omelette plate`],
      SNACK: [`${vegetable} hummus cups`, `${protein} pita bites`, `${grain} yogurt dip plate`],
      LUNCH: [`${protein} lemon rice bowl`, `${vegetable} couscous bowl`, `${protein} chickpea family salad`],
      DINNER: [`${protein} tray bake with ${vegetable}`, `${grain} pilaf with yogurt`, `${vegetable} stew with ${protein}`]
    }
  };
  return templates[cuisine]?.[mealType]?.[index % 3] ?? `${protein} family bowl`;
}

function estimateCalories(title: string, ingredients: string[]) {
  const text = `${title} ${ingredients.join(" ")}`.toLowerCase();
  let calories = 260;
  if (/chicken|fish|paneer|egg|tofu|chickpea|dal/.test(text)) calories += 90;
  if (/rice|oats|millet|ragi|jowar|pasta|noodle|rotti|dosa/.test(text)) calories += 120;
  if (/curd|yogurt|coconut|olive/.test(text)) calories += 45;
  return calories;
}

function estimateProtein(title: string, ingredients: string[]) {
  const text = `${title} ${ingredients.join(" ")}`.toLowerCase();
  let protein = 8;
  if (/chicken|fish/.test(text)) protein += 22;
  if (/paneer|tofu|egg/.test(text)) protein += 14;
  if (/dal|chickpea|lentil/.test(text)) protein += 10;
  if (/curd|yogurt/.test(text)) protein += 4;
  return protein;
}

type KidsMeal = { mealType: string; title: string; note: string; prep: number; ingredients: string[] };
const kidsMenus: Record<string, KidsMeal[][]> = {
  "0-1": buildKidsMenu([
    ["Ragi porridge with mashed banana", "Steamed apple mash", "Moong dal rice mash", "Carrot idli mash"],
    ["Soft idli soaked in dal water", "Pear puree", "Rice kanji with ghee", "Pumpkin dal mash"],
    ["Oats banana porridge", "Avocado curd mash", "Vegetable khichdi puree", "Soft dosa pieces in sambar"],
    ["Suji upma mash", "Steamed sweet potato", "Curd rice mash", "Bottle gourd dal rice"],
    ["Rice flakes banana mash", "Papaya mash", "Ragi mudde softened in dal", "Beetroot rice mash"],
    ["Moong dal dosa mash", "Chikoo mash", "Tomato dal rice", "Idiyappam coconut milk mash"],
    ["Little millet porridge", "Steamed carrot sticks mashed", "Spinach dal rice puree", "Soft pongal mash"],
    ["Idli with vegetable puree", "Mango curd mash", "Masoor dal rice", "Ash gourd sambar rice mash"],
    ["Ragi banana pancake crumbs", "Boiled potato mash", "Pumpkin khichdi", "Soft appam with dal"],
    ["Rice kanji with mashed peas", "Watermelon soft cubes", "Vegetable dalia", "Curd rice with grated cucumber"],
    ["Dosa soaked in dal", "Apple cinnamon mash", "Carrot moong khichdi", "Soft sevai upma mash"],
    ["Rava idli mash", "Banana curd mash", "Drumstick leaf dal rice", "Tomato rice mash"],
    ["Jowar porridge", "Steamed pear mash", "Lauki dal khichdi", "Soft neer dosa pieces"],
    ["Pongal mash", "Papaya banana mash", "Vegetable rice puree", "Ragi malt"],
    ["Idli podi-free mash", "Pumpkin finger mash", "Dal rice with ghee", "Soft uttapam mash"]
  ], "Mash or finely crumble; no added salt, sugar, honey, whole nuts, or hard pieces."),
  "1-2": buildKidsMenu([
    ["Mini idli with ghee sambar", "Banana ragi pancake", "Vegetable dal rice", "Curd rice with cucumber"],
    ["Soft dosa with potato palya", "Steamed sweet potato wedges", "Tomato pappu rice", "Vegetable pongal"],
    ["Ragi malt with banana", "Paneer veggie cubes", "Moong dal khichdi", "Idiyappam with mild kurma"],
    ["Vegetable upma", "Fruit curd bowl", "Spinach dal rice", "Soft chapati with dal"],
    ["Set dosa with coconut chutney", "Boiled egg wedges", "Bisi bele bath mild", "Lemon sevai"],
    ["Avalakki with peas", "Carrot cucumber sticks steamed", "Sambar rice", "Ragi dosa with curd"],
    ["Oats idli", "Chikoo banana bowl", "Pumpkin dal rice", "Vegetable pulao"],
    ["Pesarattu mini dosa", "Curd poha", "Drumstick sambar rice", "Soft appam with stew"],
    ["Suji vegetable cheela", "Mango lassi cup", "Dal dhokli soft", "Tomato rice with curd"],
    ["Ragi mudde with soppu saaru", "Apple slices steamed", "Veg khichdi", "Mini uttapam"],
    ["Idli upma", "Peanut-free chikki style date ball", "Curd rice with beetroot", "Moong dal dosa"],
    ["Rice rotti with ghee", "Boiled corn kernels mashed", "Lauki dal rice", "Vegetable sevai"],
    ["Pongal with vegetables", "Papaya bowl", "Rajma rice mashed", "Neer dosa with veg saagu"],
    ["Banana oats dosa", "Paneer bhurji mild", "Mixed dal rice", "Chapati strips with kurma"],
    ["Little millet upma", "Fruit custard no added sugar", "Tomato dal khichdi", "Idli with rasam"]
  ], "Serve soft bite-sized pieces; keep chilli very mild and supervise closely."),
  "2-3": buildKidsMenu([
    ["Vegetable uttapam", "Ragi banana muffin", "Sambar rice with ghee", "Egg dosa roll"],
    ["Idli with sambar", "Curd fruit bowl", "Chicken veggie pulao", "Dal chapati roll"],
    ["Pesarattu with chutney", "Sweet potato chaat mild", "Bisi bele bath", "Vegetable upma"],
    ["Ragi dosa", "Paneer cubes with cucumber", "Tomato pappu rice", "Appam with stew"],
    ["Avalakki upma", "Boiled egg and fruit", "Curd rice with carrot", "Mini veg paratha"],
    ["Set dosa", "Corn sundal mild", "Dal rice with beetroot", "Lemon rice with curd"],
    ["Oats idli", "Banana peanut-free laddu", "Vegetable khichdi", "Moong dal chilla"],
    ["Akki rotti soft", "Mango curd", "Gongura pappu mild", "Vegetable sevai"],
    ["Pongal", "Apple dosa bites", "Rajma rice", "Chicken dal soup with rice"],
    ["Neer dosa", "Carrot idli bites", "Soppu saaru rice", "Paneer veg pulao"],
    ["Vegetable poha", "Date sesame-free ball", "Tomato rasam rice", "Egg fried rice mild"],
    ["Ragi malt bowl", "Papaya curd", "Lauki dal khichdi", "Chapati with veg kurma"],
    ["Mini masala dosa mild", "Cucumber curd dip", "Vegetable pulihora", "Soft jowar rotti"],
    ["Suji idli", "Steamed corn cup", "Dal palak rice", "Dosa with chicken curry mild"],
    ["Little millet pongal", "Fruit chaat mild", "Sambar idli bowl", "Veg noodles home style"]
  ], "Family texture is okay; cut round foods small and keep spices gentle."),
  "3+": buildKidsMenu([
    ["Masala dosa mild", "Ragi laddoo", "Bisi bele bath", "Chicken dosa wrap"],
    ["Idli sambar", "Fruit curd parfait", "Tomato pappu rice", "Paneer paratha"],
    ["Pesarattu", "Sweet potato tikki", "Veg pulao with raita", "Egg curry with rice"],
    ["Akki rotti", "Corn sundal", "Sambar rice", "Appam with veg stew"],
    ["Set dosa", "Banana oats bites", "Gongura dal mild", "Chapati veg roll"],
    ["Vegetable upma", "Boiled egg chaat", "Curd rice with pomegranate", "Chicken khichdi"],
    ["Ragi dosa", "Paneer cucumber skewers", "Rajma rice", "Lemon sevai"],
    ["Avalakki", "Mango lassi", "Vegetable pulihora", "Moong dal cheela"],
    ["Pongal", "Carrot cucumber sticks", "Soppu saaru rice", "Mini uttapam"],
    ["Neer dosa", "Date coconut ball", "Dal palak rice", "Egg fried millet"],
    ["Oats idli", "Papaya bowl", "Lauki chana dal rice", "Dosa with kurma"],
    ["Jowar rotti", "Roasted makhana", "Tomato rasam rice", "Paneer pulao"],
    ["Mini idli bowl", "Fruit chaat", "Vegetable sambar rice", "Chicken stew appam"],
    ["Suji cheela", "Curd poha", "Gutti vankaya rice mild", "Chapati with dal"],
    ["Little millet upma", "Boiled corn cup", "Veg khichdi", "Homestyle veg noodles"]
  ], "Serve family meals with moderate spice and balanced protein, veg, and curd.")
};

function buildKidsMenu(rows: string[][], note: string): KidsMeal[][] {
  const mealTypes = ["BREAKFAST", "SNACK", "LUNCH", "DINNER"];
  return rows.map((row) =>
    row.map((title, index) => ({
      mealType: mealTypes[index],
      title,
      note,
      prep: index === 1 ? 10 : 20,
      ingredients: ["rice", "dal", "vegetables", "curd"]
    }))
  );
}
