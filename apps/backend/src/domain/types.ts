export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
export type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type ExpenseCategory =
  | "FOOD"
  | "TRIPS"
  | "UTILITIES"
  | "KIDS_GEAR"
  | "GIFTS"
  | "MISCELLANEOUS"
  | "MAINTENANCE"
  | "UNCATEGORIZED";

export type Profile = {
  id: string;
  familyId: string;
  fullName: string;
  initials: string;
  isParent: boolean;
  stars: number;
};

export type Family = {
  id: string;
  name: string;
  createdAt: string;
};

export type Routine = {
  id: string;
  familyId: string;
  title: string;
  cronSpec: string;
  daysOfWeek: Weekday[];
};

export type RoutineItem = {
  id: string;
  routineId: string;
  title: string;
  assignedToId?: string;
};

export type RoutineExecutionLog = {
  id: string;
  routineItemId: string;
  completedAt: string;
  dateString: string;
};

export type Task = {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
  assignedToId?: string;
};

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

export type KitchenAnalysis = {
  source: string;
  ingredients: string[];
  recipes: Recipe[];
  confidence: number;
  provider: "DEMO" | "GEMINI";
};

export type MealPlan = {
  id: string;
  familyId: string;
  date: string;
  recipeTitle: string;
  instructions: string[];
};

export type GroceryItem = {
  id: string;
  familyId: string;
  name: string;
  isBought: boolean;
};

export type Expense = {
  id: string;
  familyId: string;
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

export type MonthlyBudget = {
  id: string;
  familyId: string;
  month: string;
  category: ExpenseCategory;
  amount: number;
};

export type StarLedgerEntry = {
  id: string;
  profileId: string;
  delta: number;
  reason: string;
  createdAt: string;
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
};

export type AppData = {
  families: Family[];
  profiles: Profile[];
  routines: Routine[];
  routineItems: RoutineItem[];
  routineLogs: RoutineExecutionLog[];
  tasks: Task[];
  mealPlans: MealPlan[];
  groceryItems: GroceryItem[];
  expenses: Expense[];
  monthlyBudgets: MonthlyBudget[];
  starLedger: StarLedgerEntry[];
  rewardDefinitions: RewardDefinition[];
  childRewardTargets: ChildRewardTarget[];
  rewardRedemptions: RewardRedemption[];
};

export type MessagingIntent =
  | "CREATE_EXPENSE"
  | "ASSIGN_TASK"
  | "FRIDGE_VISION"
  | "CHECK_ROUTINE"
  | "CREDIT_STAR";

export type NormalizedCommand = {
  channel: "WEB" | "WHATSAPP" | "TELEGRAM";
  senderId: string;
  familyId: string;
  intent: MessagingIntent;
  payload: Record<string, unknown>;
};
