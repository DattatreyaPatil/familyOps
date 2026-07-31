export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
export type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type Profile = {
  familyId?: string;
  id: string;
  fullName: string;
  initials: string;
  isParent: boolean;
  stars: number;
};

export type RewardCategory = "TREAT" | "OUTING" | "TOY" | "SPORT" | "ACTIVITY" | "CUSTOM";
export type RewardIconKey = "ICE_CREAM" | "PARK" | "WATER_PARK" | "SPORTS_STORE" | "TOY_SHOP" | "MOVIE" | "GIFT";

export type RewardDefinition = {
  id: string;
  familyId: string;
  title: string;
  starsRequired: number;
  category: RewardCategory;
  iconKey: RewardIconKey;
  isActive: boolean;
  createdAt: string;
};

export type ChildRewardTarget = {
  id: string;
  profileId: string;
  rewardId: string;
  starsRequired: number;
  starsEarned: number;
  selectedAt: string;
  isActive: boolean;
};

export type RewardRedemption = {
  id: string;
  profileId: string;
  rewardId: string;
  starsSpent: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  resolvedAt?: string;
  child?: Profile;
  reward?: RewardDefinition;
};

export type RewardDashboard = {
  children: Profile[];
  rewards: RewardDefinition[];
  targets: ChildRewardTarget[];
  redemptions: RewardRedemption[];
};

export type RoutineView = {
  id: string;
  title: string;
  daysOfWeek: Weekday[];
  requestedWeekday: Weekday;
  isToday: boolean;
  dateString: string;
  completedCount: number;
  totalCount: number;
  items: Array<{
    id: string;
    routineId: string;
    title: string;
    assignedToId?: string;
    assignee?: Profile;
    completed: boolean;
    completedAt?: string;
  }>;
};

export type TaskView = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
  assignee?: Profile;
  overdue: boolean;
};

export type RoutineItemView = RoutineView["items"][number];

export type Recipe = {
  title: string;
  prepTimeMinutes: number;
  isKidFriendly: boolean;
  ingredientsUsed: string[];
  missingIngredients: string[];
  stepByStepInstructions: string[];
};

export type MealType = "BREAKFAST" | "SNACK" | "LUNCH" | "DINNER";

export type RegionalMealPlanDay = {
  day: number;
  region: "KARNATAKA" | "ANDHRA_PRADESH";
  mealType: MealType;
  servingNote: string;
  recipe: Recipe;
};

export type KidsAgeBand = "0-1" | "1-2" | "2-3" | "3+";

export type KidsMealOption = {
  id: string;
  ageBand: KidsAgeBand;
  mealType: MealType;
  textureNote: string;
  recipe: Recipe;
};

export type KidsMealPlanDay = {
  day: number;
  ageBand: KidsAgeBand;
  meals: KidsMealOption[];
};

export type KitchenLibrary = {
  regionalPlan: RegionalMealPlanDay[];
  kidsPlan: KidsMealPlanDay[];
  feedingSafety: string[];
};

export type KitchenResult = {
  source: string;
  ingredients: string[];
  recipes: Recipe[];
  confidence: number;
  provider: "DEMO" | "GEMINI";
};

export type AiStatus = {
  provider: "GEMINI";
  enabled: boolean;
  model: string;
};

export type ExpenseCategory =
  | "FOOD"
  | "TRIPS"
  | "UTILITIES"
  | "KIDS_GEAR"
  | "GIFTS"
  | "MISCELLANEOUS"
  | "MAINTENANCE"
  | "UNCATEGORIZED";

export type Expense = {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  receiptUrl?: string;
};

export type ReceiptAnalysis = {
  vendor: string;
  amount: number;
  currency: string;
  date: string;
  category: ExpenseCategory;
  confidence: number;
  provider: "GEMINI";
};

export type FinanceDashboard = {
  month: string;
  total: number;
  totals: Record<ExpenseCategory, number>;
  budgets: Array<{
    category: ExpenseCategory;
    amount: number;
    spent: number;
    remaining: number;
    percentage: number;
  }>;
  expenses: Expense[];
};

export type BootstrapData = {
  family: {
    id: string;
    name: string;
  };
  profiles: Profile[];
  groceries: Array<{
    id: string;
    name: string;
    isBought: boolean;
  }>;
};
