import type {
  AiStatus,
  BootstrapData,
  ExpenseCategory,
  FinanceDashboard,
  KitchenLibrary,
  KitchenResult,
  Profile,
  ReceiptAnalysis,
  Recipe,
  RewardCategory,
  RewardDashboard,
  RewardDefinition,
  RewardIconKey,
  RoutineItemView,
  RoutineView,
  TaskStatus,
  TaskView,
  Weekday
} from "./types";
import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const API_MODE = import.meta.env.VITE_API_MODE ?? "backend";
const AI_API_MODE = import.meta.env.VITE_AI_API_MODE ?? "backend";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (useSupabaseApi()) {
    return requestSupabaseFunction<T>(`app-api${path}`, init);
  }
  return requestUrl<T>(`${API_URL}${path}`, init);
}

async function requestSupabaseFunction<T>(functionName: string, init?: RequestInit): Promise<T> {
  return requestUrl<T>(`${SUPABASE_FUNCTIONS_URL}/${functionName}`, init);
}

async function requestUrl<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> =
    init?.body instanceof FormData
      ? Object.fromEntries(new Headers(init.headers).entries())
      : { "Content-Type": "application/json", ...Object.fromEntries(new Headers(init?.headers).entries()) };

  const token = accessToken ?? (await supabase?.auth.getSession())?.data.session?.access_token ?? null;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.details ? `${body.error}: ${body.details}` : body.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

function useSupabaseAi() {
  return AI_API_MODE === "supabase-edge" && Boolean(SUPABASE_URL);
}

function useSupabaseApi() {
  return API_MODE === "supabase-edge" && Boolean(SUPABASE_URL);
}

export const api = {
  bootstrap: () => request<BootstrapData>("/api/bootstrap"),
  routines: (weekday?: Weekday) => request<RoutineView[]>(`/api/routines/today${weekday ? `?weekday=${weekday}` : ""}`),
  checkRoutineItem: (routineItemId: string, completed = true) =>
    request("/api/routines/check", { method: "POST", body: JSON.stringify({ routineItemId, completed }) }),
  createRoutineItem: (input: { routineId: string; title: string; assignedToId?: string }) =>
    request<RoutineItemView>("/api/routines/items", { method: "POST", body: JSON.stringify(input) }),
  updateRoutineItem: (routineItemId: string, input: { title?: string; assignedToId?: string }) =>
    request<RoutineItemView>(`/api/routines/items/${routineItemId}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteRoutineItem: (routineItemId: string) => request(`/api/routines/items/${routineItemId}`, { method: "DELETE" }),
  tasks: () => request<TaskView[]>("/api/tasks"),
  createTask: (input: { title: string; description?: string; assignedToId?: string; dueDate?: string }) =>
    request<TaskView>("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
  updateTask: (
    taskId: string,
    input: { title?: string; description?: string; assignedToId?: string; dueDate?: string; status?: TaskStatus }
  ) => request<TaskView>(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(input) }),
  moveTask: (taskId: string, status: TaskStatus) =>
    request(`/api/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteTask: (taskId: string) => request(`/api/tasks/${taskId}`, { method: "DELETE" }),
  createProfile: (input: { fullName: string; isParent: boolean }) =>
    request<Profile>("/api/profiles", { method: "POST", body: JSON.stringify(input) }),
  updateProfile: (profileId: string, input: { fullName?: string; isParent?: boolean }) =>
    request<Profile>(`/api/profiles/${profileId}`, { method: "PATCH", body: JSON.stringify(input) }),
  analyzeKitchen: (file?: File) => {
    const data = new FormData();
    if (file) {
      data.append("image", file);
    }
    if (useSupabaseAi()) {
      return requestSupabaseFunction<KitchenResult>("analyze-kitchen", { method: "POST", body: data });
    }
    return request<KitchenResult>("/api/kitchen/analyze", { method: "POST", body: data });
  },
  aiStatus: () => (useSupabaseAi() ? requestSupabaseFunction<AiStatus>("ai-status") : request<AiStatus>("/api/ai/status")),
  kitchenLibrary: () => request<KitchenLibrary>("/api/kitchen/library"),
  selectRecipe: (recipe: Recipe, date = new Date().toISOString()) =>
    request("/api/kitchen/select-recipe", {
      method: "POST",
      body: JSON.stringify({ recipe, date })
    }),
  kids: () => request<Profile[]>("/api/kids"),
  rewardDashboard: () => request<RewardDashboard>("/api/kids/rewards"),
  createReward: (input: { title: string; starsRequired: number; category: RewardCategory; iconKey: RewardIconKey }) =>
    request<RewardDefinition>("/api/kids/rewards", { method: "POST", body: JSON.stringify(input) }),
  updateReward: (rewardId: string, input: { title?: string; starsRequired?: number; category?: RewardCategory; iconKey?: RewardIconKey }) =>
    request<RewardDefinition>(`/api/kids/rewards/${rewardId}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteReward: (rewardId: string) => request(`/api/kids/rewards/${rewardId}`, { method: "DELETE" }),
  selectRewardTarget: (profileId: string, rewardId: string) =>
    request(`/api/kids/${profileId}/target`, { method: "POST", body: JSON.stringify({ rewardId }) }),
  updateRewardTarget: (profileId: string, rewardId: string, starsRequired: number) =>
    request(`/api/kids/${profileId}/target/${rewardId}`, { method: "PATCH", body: JSON.stringify({ starsRequired }) }),
  removeRewardTarget: (profileId: string, rewardId: string) =>
    request(`/api/kids/${profileId}/target/${rewardId}`, { method: "DELETE" }),
  creditRewardStar: (profileId: string, rewardId: string, reason: string) =>
    request(`/api/kids/${profileId}/target/${rewardId}/stars`, { method: "POST", body: JSON.stringify({ reason }) }),
  requestReward: (profileId: string, rewardId: string) =>
    request(`/api/kids/${profileId}/redemptions`, { method: "POST", body: JSON.stringify({ rewardId }) }),
  approveReward: (redemptionId: string) => request(`/api/kids/redemptions/${redemptionId}/approve`, { method: "POST" }),
  rejectReward: (redemptionId: string) => request(`/api/kids/redemptions/${redemptionId}/reject`, { method: "POST" }),
  finance: (month?: string) => request<FinanceDashboard>(`/api/finance/dashboard${month ? `?month=${month}` : ""}`),
  saveBudget: (month: string, category: ExpenseCategory, amount: number) =>
    request(`/api/finance/budgets/${category}`, { method: "PUT", body: JSON.stringify({ month, amount }) }),
  addReceipt: (vendor: string, amount: number, category?: ExpenseCategory, date?: string) =>
    request("/api/finance/receipt", { method: "POST", body: JSON.stringify({ vendor, amount, category, date }) }),
  addReceiptImage: (vendor: string, amount: number, file?: File, category?: ExpenseCategory, date?: string) => {
    const data = new FormData();
    data.append("vendor", vendor);
    data.append("amount", String(amount));
    if (category) {
      data.append("category", category);
    }
    if (date) {
      data.append("date", date);
    }
    if (file) {
      data.append("receipt", file);
    }
    return request("/api/finance/receipt-image", { method: "POST", body: data });
  },
  analyzeReceipt: (file: File) => {
    const data = new FormData();
    data.append("receipt", file);
    if (useSupabaseAi()) {
      return requestSupabaseFunction<ReceiptAnalysis>("analyze-receipt", { method: "POST", body: data });
    }
    return request<ReceiptAnalysis>("/api/finance/analyze-receipt", { method: "POST", body: data });
  },
  deleteExpense: (expenseId: string) => request(`/api/finance/expenses/${expenseId}`, { method: "DELETE" })
};
