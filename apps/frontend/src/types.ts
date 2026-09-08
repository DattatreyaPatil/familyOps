export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
export type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type Profile = {
  familyId?: string;
  id: string;
  fullName: string;
  initials: string;
  isParent: boolean;
  stars: number;
  runsCold?: boolean;
};

export type WeatherSnapshot = {
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  observedAt: string;
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeedKmh: number;
  highC: number;
  lowC: number;
  sunrise: string;
  sunset: string;
  summary: string;
};

export type OutfitRecommendation = {
  profileId: string;
  profileName: string;
  layers: string[];
  note: string;
};

export type HomeDashboard = {
  weather: WeatherSnapshot | null;
  outfits: OutfitRecommendation[];
};

type AssistantActionBase = {
  id: string;
  label: string;
};

export type AssistantAction = AssistantActionBase & (
  | {
      type: "CREATE_TASK";
      payload: {
        title: string;
        description?: string;
        dueDate?: string;
        assignedToId?: string;
      };
    }
  | {
      type: "UPDATE_TASK_STATUS";
      payload: { taskId: string; status: TaskStatus };
    }
  | {
      type: "ADD_ROUTINE_ITEMS";
      payload: { routineIds: string[]; title: string; assignedToId?: string };
    }
  | {
      type: "COMPLETE_ROUTINE_ITEMS";
      payload: { routineItemIds: string[] };
    }
  | {
      type: "ADD_MEAL";
      payload: {
        date: string;
        mealType: MealType;
        audience: "family" | "kids";
        recipeTitle: string;
        notes?: string;
      };
    }
  | {
      type: "RECORD_FRIEND_VISIT";
      payload: { friendId: string; visitedAt: string; notes?: string };
    }
  | {
      type: "SET_RECURRING_BUDGET";
      payload: { category: ExpenseCategory; amount: number };
    }
);

export type AssistantReference = {
  type: "VIDEO";
  id: string;
  title: string;
  url: string;
  summary: string;
};

export type AssistantReply = {
  reply: string;
  actions: AssistantAction[];
  references: AssistantReference[];
  provider: "GEMINI";
};

export type VideoPlatform = "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "OTHER";
export type VideoAnalysisStatus = "READY" | "NEEDS_PROVIDER" | "FAILED";

export type VideoLibraryItem = {
  id: string;
  familyId: string;
  url: string;
  platform: VideoPlatform;
  title: string;
  summary: string;
  transcript: string;
  topics: string[];
  contentType: string;
  status: VideoAnalysisStatus;
  errorMessage?: string;
  createdAt: string;
  similarity?: number;
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
  calories?: number;
  proteinGrams?: number;
  cuisine?: string;
  servings?: MealServings;
  shoppingItems?: ShoppingItem[];
};

export type MealType = "BREAKFAST" | "SNACK" | "LUNCH" | "DINNER";
export type MealEffort = "EASY" | "MEDIUM" | "HARD" | "WEEKEND";
export type MealCuisine = "ANY" | "INDIAN" | "ASIAN" | "EUROPEAN" | "MEDITERRANEAN" | "KIDS";
export type ShoppingCategory = "VEGETABLE" | "PROTEIN" | "GRAIN" | "DAIRY" | "FRUIT" | "OTHER";

export type MealServings = {
  adults: number;
  kids: number;
};

export type ShoppingItem = {
  clientId?: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
};

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

export type MealGenerationInput = {
  ingredients: string;
  mealTypes: MealType[];
  effort: MealEffort;
  includes: string[];
  cuisine: MealCuisine;
  servings: MealServings;
};

export type MealPlanEntry = {
  id: string;
  familyId: string;
  date: string;
  mealType: MealType;
  audience: "family" | "kids";
  recipeTitle: string;
  instructions: string[];
  calories: number;
  proteinGrams: number;
  cuisine: string;
  source: string;
  notes?: string;
  servingsAdults: number;
  servingsKids: number;
  ingredientsUsed: string[];
  shoppingItems: ShoppingItem[];
};

export type WeeklyShoppingList = {
  id?: string;
  weekStart: string;
  items: ShoppingItem[];
  updatedAt?: string;
};

export type Friend = {
  id: string;
  familyId: string;
  name: string;
  notes?: string;
  lastMetAt?: string;
  preferredGapWeeks: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type FriendSuggestion = {
  friend: Friend;
  weeksSinceMet: number | null;
  due: boolean;
  suggestedDate: string;
  message: string;
};

export type FriendVisit = {
  id: string;
  familyId: string;
  friendId: string;
  visitedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

export type FriendCircleDashboard = {
  friends: Friend[];
  visits: FriendVisit[];
  suggestions: FriendSuggestion[];
};

export type FriendAssistantReply = { reply: string; provider: "GEMINI" };

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
    recurring: boolean;
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
