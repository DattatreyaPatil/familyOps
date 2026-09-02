import type { AppData, Routine, RoutineItem, Weekday } from "../domain/types.js";

export const familyId = "family-patil-demo";

export function createSeedData(): AppData {
  return {
    families: [
      {
        id: familyId,
        name: "Patil Family",
        createdAt: new Date().toISOString()
      }
    ],
    profiles: [
      {
        id: "profile-dad",
        familyId,
        fullName: "Dad",
        initials: "DP",
        isParent: true,
        stars: 0
      },
      {
        id: "profile-mom",
        familyId,
        fullName: "Mom",
        initials: "MP",
        isParent: true,
        stars: 0
      },
      {
        id: "profile-baby-one",
        familyId,
        fullName: "Aarav",
        initials: "AR",
        isParent: false,
        stars: 3
      },
      {
        id: "profile-baby-two",
        familyId,
        fullName: "Mira",
        initials: "MI",
        isParent: false,
        stars: 2
      }
    ],
    routines: createPresetRoutines(),
    routineItems: createPresetRoutineItems(),
    routineLogs: [],
    tasks: [
      {
        id: "task-diapers",
        familyId,
        title: "Order diapers and wipes",
        description: "Check size before ordering.",
        status: "TODO",
        dueDate: new Date(Date.now() - 86400000).toISOString(),
        assignedToId: "profile-dad"
      },
      {
        id: "task-vaccine",
        familyId,
        title: "Book vaccination appointment",
        status: "IN_PROGRESS",
        dueDate: new Date(Date.now() + 172800000).toISOString(),
        assignedToId: "profile-mom"
      },
      {
        id: "task-toys",
        familyId,
        title: "Rotate playroom toys",
        description: "Keep the quiet toys accessible for evening wind-down.",
        status: "DONE",
        assignedToId: "profile-dad"
      }
    ],
    mealPlans: [],
    groceryItems: [
      { id: "grocery-bananas", familyId, name: "Bananas", isBought: false },
      { id: "grocery-yogurt", familyId, name: "Greek yogurt", isBought: false }
    ],
    expenses: [
      {
        id: "expense-rewe",
        familyId,
        vendor: "REWE",
        amount: 84.2,
        currency: "EUR",
        category: "FOOD",
        date: new Date().toISOString()
      },
      {
        id: "expense-shell",
        familyId,
        vendor: "Shell",
        amount: 62.4,
        currency: "EUR",
        category: "TRIPS",
        date: new Date().toISOString()
      },
      {
        id: "expense-daycare",
        familyId,
        vendor: "Daycare Supplies",
        amount: 37.9,
        currency: "EUR",
        category: "KIDS_GEAR",
        date: new Date().toISOString()
      }
    ],
    monthlyBudgets: [],
    starLedger: [],
    rewardDefinitions: createPresetRewards(),
    childRewardTargets: [],
    rewardRedemptions: []
  };
}

export function createPresetRoutines(): Routine[] {
  return [
    weekdayRoutine("routine-monday", "Monday Family Routine", "MONDAY"),
    weekdayRoutine("routine-tuesday", "Tuesday Family Routine", "TUESDAY"),
    weekdayRoutine("routine-wednesday", "Wednesday Family Routine", "WEDNESDAY"),
    weekdayRoutine("routine-thursday", "Thursday Family Routine", "THURSDAY"),
    weekdayRoutine("routine-friday", "Friday Family Routine", "FRIDAY"),
    weekdayRoutine("routine-saturday", "Saturday Family Routine", "SATURDAY"),
    weekdayRoutine("routine-sunday", "Sunday Family Routine", "SUNDAY")
  ];
}

export function createPresetRoutineItems(): RoutineItem[] {
  return [
    { id: "routine-item-brush", routineId: "routine-monday", title: "Brush teeth", assignedToId: "profile-baby-one" },
    { id: "routine-item-lunch", routineId: "routine-monday", title: "Pack lunch bag", assignedToId: "profile-mom" },
    { id: "routine-item-fri-bath", routineId: "routine-friday", title: "Early bath time", assignedToId: "profile-baby-two" },
    { id: "routine-item-sun-plan", routineId: "routine-sunday", title: "Choose next week outfits", assignedToId: "profile-mom" }
  ];
}

function weekdayRoutine(id: string, title: string, day: Weekday): Routine {
  return { id, familyId, title, cronSpec: "30 6 * * *", daysOfWeek: [day] };
}

export function createPresetRewards() {
  const createdAt = new Date().toISOString();
  return [
    {
      id: "reward-ice-cream",
      familyId,
      title: "Ice cream outing",
      starsRequired: 4,
      category: "TREAT" as const,
      iconKey: "ICE_CREAM" as const,
      isActive: true,
      createdAt
    },
    {
      id: "reward-toy-shop",
      familyId,
      title: "Toy shop pick",
      starsRequired: 6,
      category: "TOY" as const,
      iconKey: "TOY_SHOP" as const,
      isActive: true,
      createdAt
    },
    {
      id: "reward-decathlon",
      familyId,
      title: "Decathlon visit",
      starsRequired: 8,
      category: "SPORT" as const,
      iconKey: "SPORTS_STORE" as const,
      isActive: true,
      createdAt
    },
    {
      id: "reward-water-park",
      familyId,
      title: "Water park day",
      starsRequired: 10,
      category: "OUTING" as const,
      iconKey: "WATER_PARK" as const,
      isActive: true,
      createdAt
    }
  ];
}
