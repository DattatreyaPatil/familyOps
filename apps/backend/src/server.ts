import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import cors from "cors";
import express from "express";
import multer from "multer";
import { z } from "zod";
import { requireSupabaseUser } from "./auth.js";
import type { DataStore } from "./data/dataStore.js";
import { familyId as localFamilyId } from "./data/seed.js";
import { JsonStore } from "./data/jsonStore.js";
import { SupabaseStore } from "./data/supabaseStore.js";
import { CommandRouter } from "./services/commandRouter.js";
import { FinanceService } from "./services/financeService.js";
import { GeminiService } from "./services/geminiService.js";
import { KidsService } from "./services/kidsService.js";
import { KitchenService } from "./services/kitchenService.js";
import { ProfileService } from "./services/profileService.js";
import { RoutineService } from "./services/routineService.js";
import { TaskService } from "./services/taskService.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const dataStoreMode = process.env.DATA_STORE ?? (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "json");
const store: DataStore = dataStoreMode === "supabase" ? new SupabaseStore() : new JsonStore();
const gemini = new GeminiService();
const routines = new RoutineService(store);
const tasks = new TaskService(store);
const kitchen = new KitchenService(store, gemini);
const kids = new KidsService(store);
const finance = new FinanceService(store);
const profiles = new ProfileService(store);
const commands = new CommandRouter({ routines, tasks, kitchen, kids, finance });

const allowedOrigins = new Set(
  ["http://localhost:5173", "http://127.0.0.1:5173", ...(process.env.FRONTEND_ORIGIN ?? "").split(",")]
    .join(",")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "famops-backend" });
});

app.use("/api", requireSupabaseUser);
app.use("/api", attachFamily);

app.get("/api/ai/status", (_req, res) => {
  res.json(gemini.status);
});

app.get("/api/bootstrap", async (_req, res, next) => {
  try {
    const data = await store.read();
    const familyId = getFamilyId(_req);
    res.json({
      family: data.families.find((family) => family.id === familyId),
      profiles: data.profiles.filter((profile) => profile.familyId === familyId),
      groceries: data.groceryItems.filter((item) => item.familyId === familyId)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/profiles", async (req, res, next) => {
  try {
    const body = z.object({ fullName: z.string().min(1), isParent: z.boolean() }).parse(req.body);
    res.status(201).json(await profiles.create({ familyId: getFamilyId(req), ...body }));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/profiles/:profileId", async (req, res, next) => {
  try {
    const body = z.object({ fullName: z.string().min(1).optional(), isParent: z.boolean().optional() }).parse(req.body);
    res.json(await profiles.update(getFamilyId(req), req.params.profileId, body));
  } catch (error) {
    next(error);
  }
});

app.get("/api/routines/today", async (_req, res, next) => {
  try {
    const weekday = z
      .enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])
      .optional()
      .parse(_req.query.weekday);
    res.json(await routines.getToday(getFamilyId(_req), weekday));
  } catch (error) {
    next(error);
  }
});

app.post("/api/routines/check", async (req, res, next) => {
  try {
    const body = z.object({ routineItemId: z.string(), completed: z.boolean().optional() }).parse(req.body);
    const result =
      typeof body.completed === "boolean"
        ? await routines.toggleItem(body.routineItemId, body.completed)
        : await routines.checkItem(body.routineItemId);
    res.status("created" in result && result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/routines/items", async (req, res, next) => {
  try {
    const body = z.object({ routineId: z.string(), title: z.string().min(1), assignedToId: z.string().optional() }).parse(req.body);
    res.status(201).json(await routines.createItem({ familyId: getFamilyId(req), ...body }));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/routines/items/:routineItemId", async (req, res, next) => {
  try {
    const body = z.object({ title: z.string().min(1).optional(), assignedToId: z.string().optional() }).parse(req.body);
    res.json(await routines.updateItem(getFamilyId(req), req.params.routineItemId, body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/routines/items/:routineItemId", async (req, res, next) => {
  try {
    res.json(await routines.deleteItem(getFamilyId(req), req.params.routineItemId));
  } catch (error) {
    next(error);
  }
});

app.get("/api/tasks", async (_req, res, next) => {
  try {
    res.json(await tasks.list(getFamilyId(_req)));
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        assignedToId: z.string().optional(),
        dueDate: z.string().optional(),
        status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE"]).optional()
      })
      .parse(req.body);
    res.status(201).json(await tasks.create({ familyId: getFamilyId(req), ...body }));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/tasks/:taskId/status", async (req, res, next) => {
  try {
    const body = z.object({ status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE"]) }).parse(req.body);
    res.json(await tasks.transition(req.params.taskId, body.status));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/tasks/:taskId", async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        assignedToId: z.string().optional(),
        dueDate: z.string().optional(),
        status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE"]).optional()
      })
      .parse(req.body);
    res.json(await tasks.update(getFamilyId(req), req.params.taskId, body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:taskId", async (req, res, next) => {
  try {
    res.json(await tasks.delete(getFamilyId(req), req.params.taskId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/kitchen/analyze", upload.single("image"), async (req, res, next) => {
  try {
    res.json(await kitchen.analyzeFridge(getFamilyId(req), req.file));
  } catch (error) {
    next(error);
  }
});

app.get("/api/kitchen/library", (_req, res) => {
  res.json(kitchen.getLibrary());
});

app.post("/api/kitchen/select-recipe", async (req, res, next) => {
  try {
    const body = z.object({ recipe: z.any(), date: z.string() }).parse(req.body);
    res.status(201).json(await kitchen.selectRecipe(getFamilyId(req), body.recipe, body.date));
  } catch (error) {
    next(error);
  }
});

app.get("/api/kids", async (_req, res, next) => {
  try {
    res.json(await kids.listChildren(getFamilyId(_req)));
  } catch (error) {
    next(error);
  }
});

app.get("/api/kids/rewards", async (_req, res, next) => {
  try {
    res.json(await kids.rewardDashboard(getFamilyId(_req)));
  } catch (error) {
    next(error);
  }
});

const rewardSchema = z.object({
  title: z.string().min(1),
  starsRequired: z.coerce.number().int().min(1).max(100),
  category: z.enum(["TREAT", "OUTING", "TOY", "SPORT", "ACTIVITY", "CUSTOM"]),
  iconKey: z.enum(["ICE_CREAM", "PARK", "WATER_PARK", "SPORTS_STORE", "TOY_SHOP", "MOVIE", "GIFT"])
});

app.post("/api/kids/rewards", async (req, res, next) => {
  try {
    res.status(201).json(await kids.createReward({ familyId: getFamilyId(req), ...rewardSchema.parse(req.body) }));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/kids/rewards/:rewardId", async (req, res, next) => {
  try {
    res.json(await kids.updateReward(getFamilyId(req), req.params.rewardId, rewardSchema.partial().parse(req.body)));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/kids/rewards/:rewardId", async (req, res, next) => {
  try {
    res.json(await kids.deleteReward(getFamilyId(req), req.params.rewardId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/kids/:profileId/target", async (req, res, next) => {
  try {
    const body = z.object({ rewardId: z.string() }).parse(req.body);
    res.status(201).json(await kids.selectTarget(req.params.profileId, body.rewardId));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/kids/:profileId/target/:rewardId", async (req, res, next) => {
  try {
    const body = z.object({ starsRequired: z.coerce.number().int().min(1).max(100) }).parse(req.body);
    res.json(await kids.updateTarget(req.params.profileId, req.params.rewardId, body.starsRequired));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/kids/:profileId/target/:rewardId", async (req, res, next) => {
  try {
    res.json(await kids.removeTarget(req.params.profileId, req.params.rewardId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/kids/:profileId/target/:rewardId/stars", async (req, res, next) => {
  try {
    const body = z.object({ reason: z.string().min(1) }).parse(req.body);
    res.status(201).json(await kids.creditTargetStar(req.params.profileId, req.params.rewardId, body.reason));
  } catch (error) {
    next(error);
  }
});

app.post("/api/kids/:profileId/redemptions", async (req, res, next) => {
  try {
    const body = z.object({ rewardId: z.string() }).parse(req.body);
    res.status(201).json(await kids.requestRedemption(req.params.profileId, body.rewardId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/kids/redemptions/:redemptionId/approve", async (req, res, next) => {
  try {
    res.json(await kids.approveRedemption(req.params.redemptionId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/kids/redemptions/:redemptionId/reject", async (req, res, next) => {
  try {
    res.json(await kids.rejectRedemption(req.params.redemptionId));
  } catch (error) {
    next(error);
  }
});

app.get("/api/finance/dashboard", async (_req, res, next) => {
  try {
    const month = z.string().regex(/^\d{4}-\d{2}$/).optional().parse(_req.query.month);
    res.json(await finance.dashboard(getFamilyId(_req), month));
  } catch (error) {
    next(error);
  }
});

const expenseCategorySchema = z.enum(["FOOD", "TRIPS", "UTILITIES", "KIDS_GEAR", "GIFTS", "MISCELLANEOUS", "MAINTENANCE", "UNCATEGORIZED"]);

app.put("/api/finance/budgets/:category", async (req, res, next) => {
  try {
    const category = expenseCategorySchema.parse(req.params.category);
    const body = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), amount: z.coerce.number().min(0) }).parse(req.body);
    res.json(await finance.setBudget(getFamilyId(req), body.month, category, body.amount));
  } catch (error) {
    next(error);
  }
});

app.post("/api/finance/receipt", async (req, res, next) => {
  try {
    const body = z.object({
      vendor: z.string().min(1),
      amount: z.coerce.number().positive(),
      category: expenseCategorySchema.optional(),
      date: z.string().datetime().optional()
    }).parse(req.body);
    res.status(201).json(await finance.addReceipt(getFamilyId(req), body.vendor, body.amount, "EUR", undefined, body.category, body.date));
  } catch (error) {
    next(error);
  }
});

app.post("/api/finance/receipt-image", upload.single("receipt"), async (req, res, next) => {
  try {
    const body = z.object({
      vendor: z.string().min(1),
      amount: z.coerce.number().positive(),
      category: expenseCategorySchema.optional(),
      date: z.string().datetime().optional()
    }).parse(req.body);
    const receiptUrl = req.file ? await saveUploadedReceipt(req.file) : undefined;
    res.status(201).json(await finance.addReceipt(getFamilyId(req), body.vendor, body.amount, "EUR", receiptUrl, body.category, body.date));
  } catch (error) {
    next(error);
  }
});

app.post("/api/finance/analyze-receipt", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error("Choose a bill picture before analysis.");
    }
    res.json(
      await gemini.analyzeReceipt({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        filename: req.file.originalname
      })
    );
  } catch (error) {
    next(error);
  }
});

app.delete("/api/finance/expenses/:expenseId", async (req, res, next) => {
  try {
    res.json(await finance.deleteExpense(getFamilyId(req), req.params.expenseId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/commands", async (req, res, next) => {
  try {
    const result = await commands.execute(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(message.includes("not found") ? 404 : 400).json({ error: message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`FamOps backend listening on http://localhost:${port}`);
});

async function saveUploadedReceipt(file: Express.Multer.File): Promise<string> {
  const uploadsDir = join(process.cwd(), "data", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  await writeFile(join(uploadsDir, filename), file.buffer);
  return `local://receipts/${filename}`;
}

async function attachFamily(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    if (store instanceof SupabaseStore) {
      if (!req.userId) {
        return res.status(401).json({ error: "Missing authenticated user" });
      }
      req.familyId = await store.ensureFamilyForUser(req.userId, req.userEmail);
    } else {
      req.familyId = localFamilyId;
    }
    next();
  } catch (error) {
    next(error);
  }
}

function getFamilyId(req: express.Request) {
  return req.familyId ?? localFamilyId;
}
