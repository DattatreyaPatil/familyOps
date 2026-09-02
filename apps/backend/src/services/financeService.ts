import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/dataStore.js";
import type { Expense, ExpenseCategory } from "../domain/types.js";

const expenseCategories: ExpenseCategory[] = [
  "FOOD",
  "GIFTS",
  "MISCELLANEOUS",
  "TRIPS",
  "UTILITIES",
  "KIDS_GEAR",
  "MAINTENANCE",
  "UNCATEGORIZED"
];

const suggestedMonthlyBudgets: Partial<Record<ExpenseCategory, number>> = {
  FOOD: 500,
  GIFTS: 100,
  MISCELLANEOUS: 30
};

export class FinanceService {
  constructor(private readonly store: DataStore) {}

  async dashboard(familyId: string, month = toMonthKey()) {
    const data = await this.store.read();
    const expenses = data.expenses.filter((expense) => expense.familyId === familyId && expense.date.startsWith(month));
    const totals = expenses.reduce<Record<ExpenseCategory, number>>(
      (acc, expense) => {
        acc[expense.category] += expense.amount;
        return acc;
      },
      {
        FOOD: 0,
        GIFTS: 0,
        MISCELLANEOUS: 0,
        TRIPS: 0,
        UTILITIES: 0,
        KIDS_GEAR: 0,
        MAINTENANCE: 0,
        UNCATEGORIZED: 0
      }
    );
    const budgets = expenseCategories.map((category) => {
      const stored = data.monthlyBudgets.find(
        (budget) => budget.familyId === familyId && budget.month === month && budget.category === category
      );
      const amount = stored?.amount ?? suggestedMonthlyBudgets[category] ?? 0;
      const spent = totals[category];
      return {
        category,
        amount,
        spent,
        remaining: amount - spent,
        percentage: amount > 0 ? Math.round((spent / amount) * 100) : spent > 0 ? 100 : 0
      };
    });

    return {
      month,
      total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      totals,
      budgets,
      expenses: expenses.sort((a, b) => b.date.localeCompare(a.date))
    };
  }

  async setBudget(familyId: string, month: string, category: ExpenseCategory, amount: number) {
    let budget = null;

    await this.store.update((data) => {
      const existing = data.monthlyBudgets.find(
        (candidate) => candidate.familyId === familyId && candidate.month === month && candidate.category === category
      );
      if (existing) {
        existing.amount = amount;
        budget = existing;
        return;
      }
      budget = { id: randomUUID(), familyId, month, category, amount };
      data.monthlyBudgets.push(budget);
    });

    return budget;
  }

  async addReceipt(
    familyId: string,
    vendor: string,
    amount: number,
    currency = "EUR",
    receiptUrl?: string,
    inputCategory?: ExpenseCategory,
    date = new Date().toISOString()
  ) {
    const category = inputCategory ?? classifyVendor(vendor);
    let expense = null;

    await this.store.update((data) => {
      const newExpense: Expense = {
        id: randomUUID(),
        familyId,
        vendor,
        amount,
        currency,
        category,
        date
      };
      newExpense.receiptUrl = receiptUrl;
      expense = newExpense;
      data.expenses.push(newExpense);
    });

    return expense;
  }

  async deleteExpense(familyId: string, expenseId: string) {
    await this.store.update((data) => {
      const index = data.expenses.findIndex((expense) => expense.id === expenseId && expense.familyId === familyId);
      if (index === -1) {
        throw new Error("Expense not found");
      }
      data.expenses.splice(index, 1);
    });

    return { deleted: true, expenseId };
  }
}

export function classifyVendor(vendor: string): ExpenseCategory {
  const normalized = vendor.toLowerCase();
  if (normalized.includes("rewe") || normalized.includes("aldi") || normalized.includes("lidl")) {
    return "FOOD";
  }
  if (normalized.includes("shell") || normalized.includes("train") || normalized.includes("taxi")) {
    return "TRIPS";
  }
  if (normalized.includes("daycare") || normalized.includes("baby") || normalized.includes("dm")) {
    return "KIDS_GEAR";
  }
  if (normalized.includes("gift") || normalized.includes("present") || normalized.includes("birthday")) {
    return "GIFTS";
  }
  return "UNCATEGORIZED";
}

export function toMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
