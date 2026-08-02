import {
  Baby,
  Camera,
  Check,
  CheckSquare,
  ChefHat,
  Circle,
  Compass,
  Dumbbell,
  Film,
  Gamepad2,
  Gift,
  IceCreamBowl,
  ListTodo,
  Moon,
  PieChart,
  Save,
  Plus,
  Settings,
  Sparkles,
  Star,
  Sun,
  TreePine,
  Trash2,
  Upload,
  UserPlus,
  Utensils,
  Waves
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  AiStatus,
  ChildRewardTarget,
  ExpenseCategory,
  FinanceDashboard,
  KidsAgeBand,
  KitchenLibrary,
  KitchenResult,
  MealEffort,
  MealType,
  Profile,
  Recipe,
  RewardCategory,
  RewardDashboard,
  RewardDefinition,
  RewardIconKey,
  RoutineView,
  TaskStatus,
  TaskView,
  Weekday
} from "./types";

type Tab = "routines" | "tasks" | "kitchen" | "finances" | "kids" | "admin";
type ThemeMode = "light" | "dark";
type RoutineDayPreset = "today" | "weekdays" | "weekend" | "full-week" | "custom";
type KitchenAudience = "family" | "kids";
type PickedMeal = {
  id: string;
  audience: KitchenAudience;
  day: number;
  date: string;
  mealType: MealType;
  recipe: Recipe;
};

const tabs: Array<{ id: Tab; label: string; icon: typeof CheckSquare }> = [
  { id: "routines", label: "Routines", icon: CheckSquare },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "finances", label: "Finances", icon: PieChart },
  { id: "kids", label: "Kids", icon: Sparkles },
  { id: "admin", label: "Admin", icon: Settings }
];

const rewardCategories: RewardCategory[] = ["TREAT", "OUTING", "TOY", "SPORT", "ACTIVITY", "CUSTOM"];
const mealTypes: MealType[] = ["BREAKFAST", "SNACK", "LUNCH", "DINNER"];
const mealIncludes = ["Eggs", "Chicken", "Veggies", "Dal", "Rice", "Millets", "Curd"];
const rewardIcons: Array<{ key: RewardIconKey; label: string }> = [
  { key: "ICE_CREAM", label: "Ice cream" },
  { key: "PARK", label: "Park" },
  { key: "WATER_PARK", label: "Water park" },
  { key: "SPORTS_STORE", label: "Sports store" },
  { key: "TOY_SHOP", label: "Toy shop" },
  { key: "MOVIE", label: "Movie" },
  { key: "GIFT", label: "Gift" }
];
const weekdays: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const financeCategories: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "FOOD", label: "Groceries" },
  { value: "GIFTS", label: "Gifts" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
  { value: "TRIPS", label: "Trips" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "KIDS_GEAR", label: "Kids gear" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "UNCATEGORIZED", label: "Uncategorized" }
];

function RewardIcon({ iconKey }: { iconKey: RewardIconKey }) {
  const icons = {
    ICE_CREAM: IceCreamBowl,
    PARK: TreePine,
    WATER_PARK: Waves,
    SPORTS_STORE: Dumbbell,
    TOY_SHOP: Gamepad2,
    MOVIE: Film,
    GIFT: Gift
  };
  const Icon = icons[iconKey];
  return (
    <span className={`reward-icon reward-icon-${iconKey.toLowerCase().replace("_", "-")}`}>
      <Icon size={25} />
    </span>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("routines");
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem("famops-theme") as ThemeMode | null) ?? "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("famops-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  return (
    <main className="app-canvas">
      <section className="app-shell">
        <aside className="desktop-nav" aria-label="Primary">
          <div className="brand-block">
            <div className="brand-mark">F</div>
            <div>
              <strong>FamOps</strong>
              <span>Family operations</span>
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>
          <div className="desktop-nav-list">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = item.id === tab;
              return (
                <button className={`desktop-nav-button ${active ? "nav-button-active" : ""}`} key={item.id} onClick={() => setTab(item.id)}>
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>
        <div className="content-area">
          {tab === "routines" && <RoutinesPage />}
          {tab === "tasks" && <TasksPage />}
          {tab === "kitchen" && <KitchenPage />}
          {tab === "finances" && <FinancePage />}
          {tab === "kids" && <KidsPage />}
          {tab === "admin" && <AdminPage goTo={setTab} />}
        </div>
        <nav className="bottom-nav" aria-label="Primary">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = item.id === tab;
            return (
              <button className={`nav-button ${active ? "nav-button-active" : ""}`} key={item.id} onClick={() => setTab(item.id)}>
                <Icon size={22} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button className="nav-button theme-nav-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
            {theme === "light" ? <Moon size={22} /> : <Sun size={22} />}
            <span>{theme === "light" ? "Dark" : "Light"}</span>
          </button>
        </nav>
      </section>
    </main>
  );
}

function PageTitle({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <header className="page-title">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
    </header>
  );
}

function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineView[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState<Weekday>(currentWeekday());
  const [newRoutineItem, setNewRoutineItem] = useState({ title: "", assignedToId: "" });
  const [routineDayPreset, setRoutineDayPreset] = useState<RoutineDayPreset>("today");
  const [routineTargetDays, setRoutineTargetDays] = useState<Weekday[]>([currentWeekday()]);
  const [routineDrafts, setRoutineDrafts] = useState<Record<string, { title: string; assignedToId: string }>>({});

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([api.routines(activeDay), api.bootstrap()])
      .then(([routineData, bootstrap]) => {
        setRoutines(routineData);
        setProfiles(bootstrap.profiles);
        setRoutineDrafts(makeRoutineDrafts(routineData));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Routines could not be loaded."))
      .finally(() => setLoading(false));
  }, [activeDay]);

  async function toggleRoutineItem(itemId: string, completed: boolean) {
    setRoutines((current) =>
      current.map((routine) => ({
        ...routine,
        completedCount: routine.items.some((item) => item.id === itemId)
          ? routine.completedCount + (completed ? 1 : -1)
          : routine.completedCount,
        items: routine.items.map((item) => (item.id === itemId ? { ...item, completed } : item))
      }))
    );
    await api.checkRoutineItem(itemId, completed);
  }

  async function addRoutineItem(routineId: string) {
    if (!newRoutineItem.title.trim()) {
      return;
    }
    try {
      const days = routineTargetDays.length ? routineTargetDays : [activeDay];
      const routineIds = await Promise.all(
        days.map(async (day) => {
          if (day === activeDay && routineId) return routineId;
          const dayRoutines = await api.routines(day);
          return dayRoutines[0]?.id;
        })
      );
      await Promise.all(
        routineIds.filter(Boolean).map((targetRoutineId) =>
          api.createRoutineItem({
            routineId: targetRoutineId!,
            title: newRoutineItem.title,
            assignedToId: newRoutineItem.assignedToId || undefined
          })
        )
      );
      const updated = await api.routines(activeDay);
      setRoutines(updated);
      setRoutineDrafts(makeRoutineDrafts(updated));
      setNewRoutineItem({ title: "", assignedToId: "" });
      setError(`Routine added to ${days.length === 1 ? formatWeekday(days[0]) : `${days.length} days`}.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Routine could not be added.");
    }
  }

  function applyRoutinePreset(preset: RoutineDayPreset) {
    setRoutineDayPreset(preset);
    if (preset === "today") setRoutineTargetDays([activeDay]);
    if (preset === "weekdays") setRoutineTargetDays(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
    if (preset === "weekend") setRoutineTargetDays(["SATURDAY", "SUNDAY"]);
    if (preset === "full-week") setRoutineTargetDays(weekdays);
  }

  function toggleRoutineTargetDay(day: Weekday) {
    setRoutineDayPreset("custom");
    setRoutineTargetDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  }

  async function saveRoutineItem(itemId: string) {
    const draft = routineDrafts[itemId];
    if (!draft?.title.trim()) {
      return;
    }
    await api.updateRoutineItem(itemId, { title: draft.title, assignedToId: draft.assignedToId || undefined });
    const updated = await api.routines(activeDay);
    setRoutines(updated);
    setRoutineDrafts(makeRoutineDrafts(updated));
  }

  async function deleteRoutineItem(itemId: string) {
    await api.deleteRoutineItem(itemId);
    const updated = await api.routines(activeDay);
    setRoutines(updated);
    setRoutineDrafts(makeRoutineDrafts(updated));
  }

  const routine = routines[0];
  const progress = routine ? Math.round((routine.completedCount / routine.totalCount) * 100) : 0;

  return (
    <>
      <PageTitle eyebrow="Weekly routines" title="Family command center" />
      <div className="weekday-tabs" aria-label="Routine day">
        {weekdays.map((weekday) => (
          <button className={activeDay === weekday ? "active" : ""} key={weekday} onClick={() => setActiveDay(weekday)}>
            {weekday.slice(0, 3)}
          </button>
        ))}
      </div>
      {error ? (
        <div className={`notice ${error.toLowerCase().includes("could not") || error.toLowerCase().includes("failed") ? "error-notice" : ""}`}>{error}</div>
      ) : null}
      {loading || !routine ? (
        <div className="card">Loading routines...</div>
      ) : (
        <>
          <section className="hero-card indigo">
            <p>{routine.title} / {formatWeekday(activeDay)}</p>
            <h2>
              {routine.completedCount} of {routine.totalCount} done
            </h2>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            {!routine.isToday && <span className="routine-preview-note">Preview mode: check off items on the scheduled day.</span>}
          </section>
          <section className="admin-panel compact">
            <div className="form-grid task-create-grid">
              <input
                value={newRoutineItem.title}
                onChange={(event) => setNewRoutineItem({ ...newRoutineItem, title: event.target.value })}
                placeholder="New routine item"
                aria-label="New routine item"
              />
              <select
                value={newRoutineItem.assignedToId}
                onChange={(event) => setNewRoutineItem({ ...newRoutineItem, assignedToId: event.target.value })}
                aria-label="Assign routine item"
              >
                <option value="">Family pool</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.fullName}
                  </option>
                ))}
              </select>
              <button onClick={() => addRoutineItem(routine.id)}>
                <Plus size={18} /> Add routine
              </button>
            </div>
            <div className="routine-day-picker">
              <div className="segmented-control">
                {([
                  ["today", "This day"],
                  ["weekdays", "Weekdays"],
                  ["weekend", "Weekend"],
                  ["full-week", "Full week"],
                  ["custom", "Custom"]
                ] as Array<[RoutineDayPreset, string]>).map(([preset, label]) => (
                  <button className={routineDayPreset === preset ? "active" : ""} key={preset} onClick={() => applyRoutinePreset(preset)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="weekday-checks">
                {weekdays.map((weekday) => (
                  <label className="choice-pill compact" key={weekday}>
                    <input type="checkbox" checked={routineTargetDays.includes(weekday)} onChange={() => toggleRoutineTargetDay(weekday)} />
                    <span>{weekday.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
          <div className="kanban-board">
            {makePeople(profiles).map((person) => {
              const items = routine.items.filter((item) => (person.id === "pool" ? !item.assignee : item.assignee?.id === person.id));
              return (
                <section className="person-column" key={person.id}>
                  <header className="person-column-header">
                    <div className="avatar">{person.initials}</div>
                    <div>
                      <h2>{person.name}</h2>
                      <p>
                        Routine / {items.filter((item) => item.completed).length} of {items.length}
                      </p>
                    </div>
                  </header>
                  <div className="person-lanes">
                    {items.map((item) => {
                      const draft = routineDrafts[item.id] ?? { title: item.title, assignedToId: item.assignedToId ?? "" };
                      return (
                        <article className="task-card" key={item.id}>
                          <div className="editable-card-grid">
                            <button
                              className={`check-box ${item.completed ? "checked" : ""}`}
                              onClick={() => toggleRoutineItem(item.id, !item.completed)}
                              disabled={!routine.isToday}
                              aria-pressed={item.completed}
                              aria-label={`${item.completed ? "Uncheck" : "Check"} ${item.title}`}
                            >
                              <Check size={24} />
                            </button>
                            <div className="edit-fields">
                              <input
                                value={draft.title}
                                onChange={(event) =>
                                  setRoutineDrafts((current) => ({
                                    ...current,
                                    [item.id]: { ...draft, title: event.target.value }
                                  }))
                                }
                                aria-label={`Routine title for ${item.title}`}
                              />
                              <select
                                value={draft.assignedToId}
                                onChange={(event) =>
                                  setRoutineDrafts((current) => ({
                                    ...current,
                                    [item.id]: { ...draft, assignedToId: event.target.value }
                                  }))
                                }
                                aria-label={`Routine assignee for ${item.title}`}
                              >
                                <option value="">Family pool</option>
                                {profiles.map((profile) => (
                                  <option key={profile.id} value={profile.id}>
                                    {profile.fullName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="task-card-actions vertical">
                              <button className="tiny-icon-button" onClick={() => saveRoutineItem(item.id)} aria-label={`Save ${item.title}`}>
                                <Save size={15} />
                              </button>
                              <button className="tiny-icon-button danger" onClick={() => deleteRoutineItem(item.id)} aria-label={`Delete ${item.title}`}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {items.length === 0 && <div className="empty-lane">No routine items</div>}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function TasksPage() {
  const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [newTask, setNewTask] = useState({ title: "", description: "", assignedToId: "", dueDate: "" });
  const [taskDrafts, setTaskDrafts] = useState<Record<string, { title: string; description: string; assignedToId: string; dueDate: string }>>({});

  useEffect(() => {
    Promise.all([api.tasks(), api.bootstrap()])
      .then(([taskData, bootstrap]) => {
        setTasks(taskData);
        setProfiles(bootstrap.profiles);
        setTaskDrafts(makeTaskDrafts(taskData));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Tasks could not be loaded."));
  }, []);

  async function move(taskId: string, status: TaskStatus) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
    await api.moveTask(taskId, status);
  }

  async function toggleDone(task: TaskView) {
    await move(task.id, task.status === "DONE" ? "TODO" : "DONE");
  }

  async function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    await api.deleteTask(taskId);
  }

  async function saveTask(taskId: string) {
    const draft = taskDrafts[taskId];
    if (!draft?.title.trim()) {
      return;
    }
    await api.updateTask(taskId, {
      title: draft.title,
      description: draft.description || undefined,
      assignedToId: draft.assignedToId || undefined,
      dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : undefined
    });
    const updated = await api.tasks();
    setTasks(updated);
    setTaskDrafts(makeTaskDrafts(updated));
  }

  async function createTask() {
    if (!newTask.title.trim()) {
      return;
    }
    await api.createTask({
      title: newTask.title,
      description: newTask.description || undefined,
      assignedToId: newTask.assignedToId || undefined,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined
    });
    setNewTask({ title: "", description: "", assignedToId: "", dueDate: "" });
    const updated = await api.tasks();
    setTasks(updated);
    setTaskDrafts(makeTaskDrafts(updated));
  }

  const people = makePeople(profiles);

  return (
    <>
      <PageTitle eyebrow="Shared work" title="Task board" />
      {error && <div className="notice error-notice">{error}</div>}
      <section className="admin-panel compact">
        <div className="form-grid task-create-grid">
          <input
            value={newTask.title}
            onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
            placeholder="New task title"
            aria-label="New task title"
          />
          <select
            value={newTask.assignedToId}
            onChange={(event) => setNewTask({ ...newTask, assignedToId: event.target.value })}
            aria-label="Assign task"
          >
            <option value="">Family pool</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName}
              </option>
            ))}
          </select>
          <input
            value={newTask.dueDate}
            onChange={(event) => setNewTask({ ...newTask, dueDate: event.target.value })}
            type="date"
            aria-label="Due date"
          />
          <button onClick={createTask}>
            <Plus size={18} /> Add task
          </button>
          <input
            className="wide-input"
            value={newTask.description}
            onChange={(event) => setNewTask({ ...newTask, description: event.target.value })}
            placeholder="Optional note"
            aria-label="Task note"
          />
        </div>
      </section>
      <div className="kanban-board">
        {people.map((person) => {
          const personTasks = tasks.filter((task) => (person.id === "pool" ? !task.assignee : task.assignee?.id === person.id));
          return (
            <section className="person-column" key={person.id}>
              <header className="person-column-header">
                <div className="avatar">{person.initials}</div>
                <div>
                  <h2>{person.name}</h2>
                  <p>
                    {person.role} / {personTasks.length} tasks
                  </p>
                </div>
              </header>
              <div className="person-lanes">
                {statuses.map((status) => (
                  <div className="status-lane" key={status}>
                    <h3>{status.replace("_", " ")}</h3>
                    {personTasks
                      .filter((task) => task.status === status)
                      .map((task) => (
                        <article className="task-card" key={task.id}>
                          <div className="task-card-toolbar">
                            {task.overdue && <span className="badge danger">Overdue</span>}
                            <div className="task-card-actions">
                              <button className="tiny-icon-button" onClick={() => saveTask(task.id)} aria-label={`Save ${task.title}`}>
                                <Save size={15} />
                              </button>
                              <button className="tiny-icon-button danger" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                          <div className="task-main-grid">
                            <button
                              className={`check-box ${task.status === "DONE" ? "checked" : ""}`}
                              onClick={() => toggleDone(task)}
                              aria-pressed={task.status === "DONE"}
                              aria-label={`${task.status === "DONE" ? "Reopen" : "Complete"} ${task.title}`}
                            >
                              <Check size={24} />
                            </button>
                            <div className="task-body edit-fields">
                              <input
                                value={taskDrafts[task.id]?.title ?? task.title}
                                onChange={(event) =>
                                  setTaskDrafts((current) => ({
                                    ...current,
                                    [task.id]: {
                                      ...(current[task.id] ?? taskToDraft(task)),
                                      title: event.target.value
                                    }
                                  }))
                                }
                                aria-label={`Task title for ${task.title}`}
                              />
                            <input
                              value={taskDrafts[task.id]?.description ?? task.description ?? ""}
                              onChange={(event) =>
                                setTaskDrafts((current) => ({
                                  ...current,
                                  [task.id]: {
                                    ...(current[task.id] ?? taskToDraft(task)),
                                    description: event.target.value
                                  }
                                }))
                              }
                              placeholder="Task note"
                              aria-label={`Task note for ${task.title}`}
                            />
                            <div className="inline-form-row">
                              <select
                                value={taskDrafts[task.id]?.assignedToId ?? task.assignee?.id ?? ""}
                                onChange={(event) =>
                                  setTaskDrafts((current) => ({
                                    ...current,
                                    [task.id]: {
                                      ...(current[task.id] ?? taskToDraft(task)),
                                      assignedToId: event.target.value
                                    }
                                  }))
                                }
                                aria-label={`Assignee for ${task.title}`}
                              >
                                <option value="">Family pool</option>
                                {profiles.map((profile) => (
                                  <option key={profile.id} value={profile.id}>
                                    {profile.fullName}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={taskDrafts[task.id]?.dueDate ?? dateToInput(task.dueDate)}
                                onChange={(event) =>
                                  setTaskDrafts((current) => ({
                                    ...current,
                                    [task.id]: {
                                      ...(current[task.id] ?? taskToDraft(task)),
                                      dueDate: event.target.value
                                    }
                                  }))
                                }
                                aria-label={`Due date for ${task.title}`}
                              />
                            </div>
                            <div className="task-status-checks" aria-label={`Status for ${task.title}`}>
                              {statuses.map((candidate) => (
                                <button
                                  className={`status-check ${task.status === candidate ? "selected" : ""}`}
                                  key={candidate}
                                  onClick={() => move(task.id, candidate)}
                                  aria-pressed={task.status === candidate}
                                >
                                  {task.status === candidate ? <Check size={16} /> : <Circle size={16} />}
                                  <span>{candidate === "IN_PROGRESS" ? "Doing" : candidate === "TODO" ? "To do" : "Done"}</span>
                                </button>
                              ))}
                            </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    {personTasks.filter((task) => task.status === status).length === 0 && <div className="empty-lane">No tasks</div>}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function KitchenPage() {
  const [familyResult, setFamilyResult] = useState<KitchenResult | null>(null);
  const [kidsResult, setKidsResult] = useState<KitchenResult | null>(null);
  const [library, setLibrary] = useState<KitchenLibrary | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [notice, setNotice] = useState("");
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [kidsStartDate, setKidsStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedKidsDay, setSelectedKidsDay] = useState(1);
  const [kidsAgeBand, setKidsAgeBand] = useState<KidsAgeBand>("0-1");
  const [ingredientText, setIngredientText] = useState("rice, dal, tomato, onion, curd, carrot");
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>(["LUNCH", "DINNER"]);
  const [kidsMealTypes, setKidsMealTypes] = useState<MealType[]>(["BREAKFAST", "LUNCH", "DINNER"]);
  const [effort, setEffort] = useState<MealEffort>("EASY");
  const [includes, setIncludes] = useState<string[]>(["Veggies", "Dal"]);
  const [customInclude, setCustomInclude] = useState("");
  const [candidateTargetDays, setCandidateTargetDays] = useState<Record<string, number>>({});
  const [pickedMeals, setPickedMeals] = useState<PickedMeal[]>([]);

  useEffect(() => {
    Promise.all([api.kitchenLibrary(), api.aiStatus()])
      .then(([mealLibrary, status]) => {
        setLibrary(mealLibrary);
        setAiStatus(status);
        const initialFamilyRecipes = mealLibrary.regionalPlan.slice(0, 14).map((meal) => meal.recipe);
        setFamilyResult({
          source: "Regional rotation",
          ingredients: ["rice", "dal", "vegetables", "curd"],
          recipes: initialFamilyRecipes,
          confidence: 1,
          provider: "DEMO"
        });
      })
      .catch((loadError) => setNotice(loadError instanceof Error ? loadError.message : "Kitchen data could not be loaded."));
  }, []);

  async function analyze(file?: File) {
    setBusy(true);
    try {
      const analysis = await api.analyzeKitchen(file);
      const scannedIngredients = analysis.ingredients.join(", ");
      setIngredientText(scannedIngredients);
      const generated = await api.generateMeals({
        ingredients: scannedIngredients,
        mealTypes: selectedMealTypes,
        effort,
        includes
      });
      setFamilyResult({
        ...generated,
        source: analysis.provider === "GEMINI" ? "Fridge scan + meal generator" : "Demo fridge scan + meal generator",
        ingredients: analysis.ingredients.length ? analysis.ingredients : generated.ingredients,
        provider: analysis.provider
      });
      setNotice(
        analysis.provider === "GEMINI"
          ? "Fridge scan found ingredients and generated week dishes."
          : "Demo scan found ingredients and generated week dishes."
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Kitchen analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generateFamilyMeals() {
    setBusy(true);
    try {
      const generated = await api.generateMeals({
        ingredients: ingredientText,
        mealTypes: selectedMealTypes,
        effort,
        includes
      });
      setFamilyResult(generated);
      setNotice(`Generated ${generated.recipes.length} family dish candidates. Pick any meals you want to keep.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Meal generation failed.");
    } finally {
      setBusy(false);
    }
  }

  function generateKidsMeals() {
    const plans = library?.kidsPlan.filter((day) => day.ageBand === kidsAgeBand).slice(0, 7) ?? [];
    const recipes = plans.flatMap((day) => day.meals.filter((meal) => kidsMealTypes.includes(meal.mealType)).map((meal) => meal.recipe));
    setKidsResult({
      source: `${kidsAgeBand} kids menu`,
      ingredients: ["rice", "dal", "ragi", "vegetables", "curd"],
      recipes,
      confidence: 1,
      provider: "DEMO"
    });
    setNotice(`Regenerated ${recipes.length} age-aware kids meals. Existing picked meals are still kept.`);
  }

  function toggleMealType(mealType: MealType, audience: KitchenAudience) {
    const setter = audience === "kids" ? setKidsMealTypes : setSelectedMealTypes;
    setter((current) =>
      current.includes(mealType) ? current.filter((item) => item !== mealType) : [...current, mealType]
    );
  }

  function toggleInclude(item: string) {
    setIncludes((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
  }

  function addCustomInclude() {
    const value = customInclude.trim();
    if (!value) return;
    setIncludes((current) => (current.some((item) => item.toLowerCase() === value.toLowerCase()) ? current : [...current, value]));
    setCustomInclude("");
  }

  function candidateKey(audience: KitchenAudience, recipe: Recipe, index: number) {
    return `${audience}-${index}-${recipe.title}`;
  }

  function pickRecipe(recipe: Recipe, audience: KitchenAudience, index: number, mealType?: MealType) {
    const activeTypes = audience === "kids" ? kidsMealTypes : selectedMealTypes;
    const safeTypes = activeTypes.length ? activeTypes : mealTypes;
    const key = candidateKey(audience, recipe, index);
    const day = candidateTargetDays[key] ?? Math.floor(index / safeTypes.length) + 1;
    const slot = mealType ?? safeTypes[index % safeTypes.length];
    const date = dateForPlanDay(audience === "kids" ? kidsStartDate : planStartDate, Math.min(day, 7));
    const id = `${audience}-${date}-${slot}-${recipe.title}`;
    setPickedMeals((current) => {
      if (current.some((meal) => meal.id === id)) return current;
      return [...current, { id, audience, day: Math.min(day, 7), date, mealType: slot, recipe }];
    });
    setNotice(`${recipe.title} picked for ${formatShortDate(date)} ${formatMealType(slot)}.`);
  }

  function removePickedMeal(id: string) {
    setPickedMeals((current) => current.filter((meal) => meal.id !== id));
  }

  async function savePickedPlan() {
    if (!pickedMeals.length) {
      setNotice("Pick at least one recipe before saving the week plan.");
      return;
    }
    setSavingPlan(true);
    try {
      await Promise.all(pickedMeals.map((meal) => api.selectRecipe(meal.recipe, `${meal.date}T12:00:00.000Z`)));
      setNotice(`${pickedMeals.length} picked meals saved to Supabase meal plan.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the picked meal plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  const includeOptions = Array.from(new Set([...mealIncludes, ...includes]));

  function planKidsDay() {
    const selectedPlan = library?.kidsPlan.find((day) => day.ageBand === kidsAgeBand && day.day === selectedKidsDay);
    if (!selectedPlan) {
      return;
    }
    const meals = selectedPlan.meals.map((meal) => ({
      id: `kids-${dateForPlanDay(kidsStartDate, selectedKidsDay)}-${meal.mealType}-${meal.recipe.title}`,
      audience: "kids" as const,
      day: selectedKidsDay,
      date: dateForPlanDay(kidsStartDate, selectedKidsDay),
      mealType: meal.mealType,
      recipe: meal.recipe
    }));
    setPickedMeals((current) => mergePickedMeals(current, meals));
    setNotice(`Kids meals for ${formatShortDate(dateForPlanDay(kidsStartDate, selectedKidsDay))} added to picked week.`);
  }

  function planKidsFortnight() {
    const plans = library?.kidsPlan.filter((day) => day.ageBand === kidsAgeBand).slice(0, 7);
    if (!plans) {
      return;
    }
    const meals = plans.flatMap((day) =>
      day.meals.map((meal) => ({
        id: `kids-${dateForPlanDay(kidsStartDate, day.day)}-${meal.mealType}-${meal.recipe.title}`,
        audience: "kids" as const,
        day: day.day,
        date: dateForPlanDay(kidsStartDate, day.day),
        mealType: meal.mealType,
        recipe: meal.recipe
      }))
    );
    setPickedMeals((current) => mergePickedMeals(current, meals));
    setNotice(`Kids week for ${kidsAgeBand} years added to picked meals.`);
  }

  return (
    <>
      <PageTitle eyebrow="Meals and nutrition" title="Family kitchen" />
      {notice && <div className="notice">{notice}</div>}
      {aiStatus && (
        <div className={`ai-status ${aiStatus.enabled ? "ready" : ""}`}>
          <Sparkles size={17} />
          <span>{aiStatus.enabled ? `Gemini ready: ${aiStatus.model}` : "Gemini not configured: using demo scan results"}</span>
        </div>
      )}
      <section className="kitchen-studio">
        <div className="pantry-chat">
          <div>
            <span className="section-kicker">Pantry chat</span>
            <h2>What do you have at home?</h2>
          </div>
          <textarea
            value={ingredientText}
            onChange={(event) => setIngredientText(event.target.value)}
            placeholder="Example: rice, dal, tomato, onion, curd, eggs, chicken, spinach"
          />
          <div className="meal-option-grid" aria-label="Meal types">
            {mealTypes.map((mealType) => (
              <label className="choice-pill" key={mealType}>
                <input
                  type="checkbox"
                  checked={selectedMealTypes.includes(mealType)}
                  onChange={() => toggleMealType(mealType, "family")}
                />
                <span>{formatMealType(mealType)}</span>
              </label>
            ))}
          </div>
          <div className="meal-preferences">
            <label>
              Week starts
              <input type="date" value={planStartDate} onChange={(event) => event.target.value && setPlanStartDate(event.target.value)} />
            </label>
            <label>
              Effort
              <select value={effort} onChange={(event) => setEffort(event.target.value as MealEffort)}>
                <option value="EASY">Easy weekday</option>
                <option value="MEDIUM">Medium effort</option>
                <option value="WEEKEND">Weekend cooking</option>
              </select>
            </label>
            <div>
              <span>Include</span>
              <div className="include-grid">
                {includeOptions.map((item) => (
                  <label className="choice-pill compact" key={item}>
                    <input type="checkbox" checked={includes.includes(item)} onChange={() => toggleInclude(item)} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              <div className="custom-include-row">
                <input
                  value={customInclude}
                  onChange={(event) => setCustomInclude(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomInclude();
                    }
                  }}
                  placeholder="Add item"
                  aria-label="Add custom include item"
                />
                <button type="button" onClick={addCustomInclude}>
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          </div>
          <div className="kitchen-command-row">
            <button className="primary-button" onClick={generateFamilyMeals} disabled={busy || selectedMealTypes.length === 0}>
              {busy ? "Generating..." : "Generate from chat"}
            </button>
            <button className="secondary-planner-action" onClick={generateFamilyMeals} disabled={busy || selectedMealTypes.length === 0}>
              Regenerate chat plan
            </button>
          </div>
        </div>
        <label className="dropzone compact-scan">
          <Camera size={30} />
          <strong>{busy ? "Scanning and generating..." : "Fridge scan"}</strong>
          <span>{aiStatus?.enabled ? "Scan image, then use the same generator." : "Demo scan uses the same generator."}</span>
          <input type="file" accept="image/*" onChange={(event) => analyze(event.target.files?.[0])} />
        </label>
      </section>
      <PickedMealPlan meals={pickedMeals} onRemove={removePickedMeal} onSave={savePickedPlan} saving={savingPlan} />
      {familyResult && (
        <>
          <section className="card">
            <h2>Recipe inputs</h2>
            <div className="chip-row">
              {familyResult.ingredients.map((ingredient) => (
                <span className="chip" key={ingredient}>
                  {ingredient}
                </span>
              ))}
            </div>
          </section>
          <div className="recipe-slider generated-recipes">
            {familyResult.recipes.map((recipe, index) => (
              <article className="recipe-card" key={`${recipe.title}-${index}`}>
                <span>
                  Day {Math.floor(index / Math.max(selectedMealTypes.length, 1)) + 1} -{" "}
                  {formatMealType(selectedMealTypes[index % Math.max(selectedMealTypes.length, 1)] ?? "LUNCH")}
                </span>
                <h2>{recipe.title}</h2>
                <p>
                  {recipe.prepTimeMinutes} min, {recipe.isKidFriendly ? "Kid friendly" : "Parent plate"}
                </p>
                <div className="mini-chip-row">
                  {recipe.ingredientsUsed.slice(0, 5).map((ingredient) => (
                    <span key={ingredient}>{ingredient}</span>
                  ))}
                </div>
                <h3>Missing</h3>
                <p>{recipe.missingIngredients.length ? recipe.missingIngredients.join(", ") : "Nothing major"}</p>
                <label className="recipe-day-select">
                  Add to day
                  <select
                    value={candidateTargetDays[candidateKey("family", recipe, index)] ?? Math.min(Math.floor(index / Math.max(selectedMealTypes.length, 1)) + 1, 7)}
                    onChange={(event) =>
                      setCandidateTargetDays((current) => ({
                        ...current,
                        [candidateKey("family", recipe, index)]: Number(event.target.value)
                      }))
                    }
                  >
                    {Array.from({ length: 7 }, (_, dayIndex) => (
                      <option key={dayIndex + 1} value={dayIndex + 1}>
                        Day {dayIndex + 1} - {formatShortDate(dateForPlanDay(planStartDate, dayIndex + 1))}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => pickRecipe(recipe, "family", index, selectedMealTypes[index % Math.max(selectedMealTypes.length, 1)] ?? "LUNCH")}
                >
                  Pick
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {library && (
        <>
          <section className="kids-meal-library">
            <div className="planner-header">
              <div>
                <span>Kids meals</span>
                <h2>15-day healthy Indian meal calendar</h2>
              </div>
              <div className="planner-controls">
                <label className="kids-plan-date">
                  Start date
                  <input type="date" value={kidsStartDate} onChange={(event) => event.target.value && setKidsStartDate(event.target.value)} />
                </label>
                <button onClick={planKidsDay}>Plan selected day</button>
                <button className="secondary-planner-action" onClick={planKidsFortnight}>Plan all 15 days</button>
              </div>
            </div>
            <div className="kids-generator-row">
              <div className="meal-option-grid" aria-label="Kids meal types">
                {mealTypes.map((mealType) => (
                  <label className="choice-pill compact" key={mealType}>
                    <input type="checkbox" checked={kidsMealTypes.includes(mealType)} onChange={() => toggleMealType(mealType, "kids")} />
                    <span>{formatMealType(mealType)}</span>
                  </label>
                ))}
              </div>
              <button className="secondary-planner-action" onClick={generateKidsMeals}>
                Regenerate kids dishes
              </button>
            </div>
            <div className="age-tabs" aria-label="Kids age category">
              {(["0-1", "1-2", "2-3", "3+"] as KidsAgeBand[]).map((ageBand) => (
                <button className={kidsAgeBand === ageBand ? "active" : ""} key={ageBand} onClick={() => setKidsAgeBand(ageBand)}>
                  {ageBand} years
                </button>
              ))}
            </div>
            <div className="feeding-note">
              {kidsAgeBand === "0-1" ? (
                library.feedingSafety.map((note, index) => <span className={index === 0 ? "emphasis" : ""} key={note}>{note}</span>)
              ) : (
                <span>Keep chilli mild and serve soft, manageable portions for children.</span>
              )}
            </div>
            <div className="kids-calendar-strip" aria-label="Kids 15 day meal calendar">
              {Array.from({ length: 15 }, (_, index) => {
                const day = index + 1;
                const date = dateForPlanDay(kidsStartDate, day);
                const isToday = date === new Date().toISOString().slice(0, 10);
                return (
                  <button
                    className={`${selectedKidsDay === day ? "active" : ""} ${isToday ? "today" : ""}`}
                    key={day}
                    onClick={() => setSelectedKidsDay(day)}
                    aria-pressed={selectedKidsDay === day}
                  >
                    <span>Day {day}</span>
                    <strong>{formatShortDate(date)}</strong>
                    {isToday && <small>Today</small>}
                  </button>
                );
              })}
            </div>
            <div className="selected-kids-date">
              <strong>{kidsAgeBand} years</strong>
              <span>{formatShortDate(dateForPlanDay(kidsStartDate, selectedKidsDay))}, Day {selectedKidsDay}</span>
            </div>
            <div className="meal-table-wrap">
              <table className="meal-table kids-table">
                <thead>
                  <tr>
                    <th>Meal</th>
                    <th>Dish</th>
                    <th>Preparation</th>
                    <th>Prep</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {library.kidsPlan
                    .find((day) => day.ageBand === kidsAgeBand && day.day === selectedKidsDay)
                    ?.meals.map((meal) => (
                      <tr key={meal.id}>
                        <td><strong>{formatMealType(meal.mealType)}</strong></td>
                        <td>{meal.recipe.title}</td>
                        <td>{meal.textureNote}</td>
                        <td>{meal.recipe.prepTimeMinutes} min</td>
                        <td>
                          <button onClick={() => pickRecipe(meal.recipe, "kids", selectedKidsDay - 1, meal.mealType)}>Pick</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {kidsResult && (
              <div className="recipe-slider generated-recipes kids-generated">
                {kidsResult.recipes.map((recipe, index) => (
                  <article className="recipe-card" key={`${recipe.title}-${index}`}>
                    <span>
                      Kids day {Math.floor(index / Math.max(kidsMealTypes.length, 1)) + 1} -{" "}
                      {formatMealType(kidsMealTypes[index % Math.max(kidsMealTypes.length, 1)] ?? "LUNCH")}
                    </span>
                    <h2>{recipe.title}</h2>
                    <p>{recipe.prepTimeMinutes} min, age-aware portion</p>
                    <label className="recipe-day-select">
                      Add to day
                      <select
                        value={candidateTargetDays[candidateKey("kids", recipe, index)] ?? Math.min(Math.floor(index / Math.max(kidsMealTypes.length, 1)) + 1, 7)}
                        onChange={(event) =>
                          setCandidateTargetDays((current) => ({
                            ...current,
                            [candidateKey("kids", recipe, index)]: Number(event.target.value)
                          }))
                        }
                      >
                        {Array.from({ length: 7 }, (_, dayIndex) => (
                          <option key={dayIndex + 1} value={dayIndex + 1}>
                            Day {dayIndex + 1} - {formatShortDate(dateForPlanDay(kidsStartDate, dayIndex + 1))}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button onClick={() => pickRecipe(recipe, "kids", index, kidsMealTypes[index % Math.max(kidsMealTypes.length, 1)] ?? "LUNCH")}>
                      Pick
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function PickedMealPlan({
  meals,
  onRemove,
  onSave,
  saving
}: {
  meals: PickedMeal[];
  onRemove: (id: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const sortedMeals = [...meals].sort((a, b) => a.date.localeCompare(b.date) || mealTypes.indexOf(a.mealType) - mealTypes.indexOf(b.mealType));
  return (
    <section className="picked-plan">
      <div className="planner-header">
        <div>
          <span>Picked plan</span>
          <h2>Selected meals for the week</h2>
        </div>
        <button className="primary-button" onClick={onSave} disabled={!meals.length || saving}>
          {saving ? "Saving..." : `Save ${meals.length || ""} picked meals`}
        </button>
      </div>
      {sortedMeals.length ? (
        <div className="picked-week-grid">
          {Array.from({ length: 7 }, (_, index) => {
            const day = index + 1;
            const dayMeals = sortedMeals.filter((meal) => meal.day === day);
            return (
              <article className="picked-day" key={day}>
                <span>Day {day}</span>
                <strong>{formatShortDate(dayMeals[0]?.date ?? dateForPlanDay(new Date().toISOString().slice(0, 10), day))}</strong>
                <div>
                  {dayMeals.map((meal) => (
                    <button className={`picked-meal ${meal.audience}`} key={meal.id} onClick={() => onRemove(meal.id)} title="Remove from picked plan">
                      <small>{formatMealType(meal.mealType)} - {meal.audience === "kids" ? "Kids" : "Family"}</small>
                      <span>{meal.recipe.title}</span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-picked-plan">Pick recipes from generated dishes, fridge scan results, regional meals, or kids meals.</div>
      )}
    </section>
  );
}

function mergePickedMeals(current: PickedMeal[], incoming: PickedMeal[]) {
  const existing = new Set(current.map((meal) => meal.id));
  return [...current, ...incoming.filter((meal) => !existing.has(meal.id))];
}

function expandToWeek(result: KitchenResult, selectedTypes: MealType[]): KitchenResult {
  const types = selectedTypes.length ? selectedTypes : ["LUNCH"];
  const target = Math.max(7 * types.length, result.recipes.length);
  const recipes = Array.from({ length: target }, (_, index) => {
    const base = result.recipes[index % Math.max(result.recipes.length, 1)];
    if (base) return index < result.recipes.length ? base : { ...base, title: `${base.title} variation ${Math.floor(index / result.recipes.length) + 1}` };
    return {
      title: "Quick vegetable dal rice",
      prepTimeMinutes: 20,
      isKidFriendly: true,
      ingredientsUsed: result.ingredients,
      missingIngredients: [],
      stepByStepInstructions: ["Cook dal and rice.", "Add vegetables.", "Serve warm."]
    };
  });
  return { ...result, recipes };
}

function KidsPage() {
  const [dashboard, setDashboard] = useState<RewardDashboard | null>(null);
  const [message, setMessage] = useState("");
  const [rewardForm, setRewardForm] = useState<{
    title: string;
    starsRequired: number;
    category: RewardCategory;
    iconKey: RewardIconKey;
  }>({ title: "", starsRequired: 4, category: "TREAT", iconKey: "ICE_CREAM" });
  const [rewardDrafts, setRewardDrafts] = useState<Record<string, RewardDefinition>>({});

  useEffect(() => {
    loadRewards();
  }, []);

  async function loadRewards() {
    try {
      const data = await api.rewardDashboard();
      setDashboard(data);
      setRewardDrafts(Object.fromEntries(data.rewards.map((reward) => [reward.id, reward])));
    } catch (loadError) {
      setMessage(loadError instanceof Error ? loadError.message : "Rewards could not be loaded.");
    }
  }

  async function credit(profileId: string, rewardId: string, reason: string) {
    try {
      await api.creditRewardStar(profileId, rewardId, reason);
      await loadRewards();
      setMessage("Star added to this reward.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add star");
    }
  }

  async function createReward() {
    if (!rewardForm.title.trim()) {
      return;
    }
    await api.createReward(rewardForm);
    setRewardForm({ title: "", starsRequired: 4, category: "TREAT", iconKey: "ICE_CREAM" });
    await loadRewards();
    setMessage("Reward added to the catalog.");
  }

  async function saveReward(rewardId: string) {
    await api.updateReward(rewardId, rewardDrafts[rewardId]);
    await loadRewards();
    setMessage("Reward updated.");
  }

  async function deleteReward(rewardId: string) {
    await api.deleteReward(rewardId);
    await loadRewards();
    setMessage("Reward removed.");
  }

  async function selectTarget(profileId: string, rewardId: string) {
    await api.selectRewardTarget(profileId, rewardId);
    await loadRewards();
    setMessage("Reward added to the child's goals.");
  }

  async function removeTarget(profileId: string, rewardId: string) {
    await api.removeRewardTarget(profileId, rewardId);
    await loadRewards();
    setMessage("Reward removed from current goals.");
  }

  async function adjustTargetStars(profileId: string, rewardId: string, starsRequired: number) {
    try {
      await api.updateRewardTarget(profileId, rewardId, Math.max(1, starsRequired));
      await loadRewards();
      setMessage("Goal stars updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update goal stars.");
    }
  }

  async function requestReward(profileId: string, rewardId: string) {
    try {
      await api.requestReward(profileId, rewardId);
      await loadRewards();
      setMessage("Sent to parents for approval.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not request reward");
    }
  }

  async function resolveReward(redemptionId: string, approve: boolean) {
    if (approve) {
      await api.approveReward(redemptionId);
      setMessage("Reward approved and stars spent.");
    } else {
      await api.rejectReward(redemptionId);
      setMessage("Reward request declined.");
    }
    await loadRewards();
  }

  return (
    <>
      <PageTitle eyebrow="Tiny wins" title="Reward studio" />
      {message && <div className="notice">{message}</div>}
      {dashboard && (
        <>
          <section className="reward-child-grid">
            {dashboard.children.map((child) => {
              const selectedRewards = dashboard.targets
                .filter((item) => item.profileId === child.id)
                .map((target) => ({ target, reward: dashboard.rewards.find((reward) => reward.id === target.rewardId) }))
                .filter((entry): entry is { target: ChildRewardTarget; reward: RewardDefinition } => Boolean(entry.reward));
              return (
                <article className="reward-child-card" key={child.id}>
                  <header className="kid-heading">
                    <div className="child-avatar">
                      <Baby size={25} />
                    </div>
                    <div>
                      <h2>{child.fullName}</h2>
                      <p>{selectedRewards.length} active reward {selectedRewards.length === 1 ? "goal" : "goals"}</p>
                    </div>
                  </header>
                  <div className="child-goals">
                    {selectedRewards.length === 0 && <p className="muted-copy">Choose one or more reward goals below.</p>}
                    {selectedRewards.map(({ target, reward }) => {
                      const pending = dashboard.redemptions.find(
                        (item) => item.profileId === child.id && item.rewardId === reward.id && item.status === "PENDING"
                      );
                      return (
                        <article className="goal-card" key={target.id}>
                          <RewardIcon iconKey={reward.iconKey} />
                          <div className="goal-copy">
                            <strong>{reward.title}</strong>
                            <div className="goal-stars" aria-label={`${target.starsEarned} of ${target.starsRequired} stars for ${reward.title}`}>
                              {Array.from({ length: Math.min(target.starsRequired, 12) }, (_, index) => (
                                <button
                                  className={`goal-star-button ${index < target.starsEarned ? "earned" : ""}`}
                                  disabled={index < target.starsEarned || Boolean(pending)}
                                  key={index}
                                  onClick={() => credit(child.id, reward.id, "Star tapped")}
                                  aria-label={
                                    index < target.starsEarned
                                      ? `Earned star ${index + 1} for ${reward.title}`
                                      : `Add star to ${reward.title}`
                                  }
                                >
                                  <Star className={index < target.starsEarned ? "goal-star earned" : "goal-star"} size={18} />
                                </button>
                              ))}
                            </div>
                            <span>{target.starsEarned} / {target.starsRequired} stars</span>
                            <div className="goal-credit-actions">
                              <button disabled={Boolean(pending)} onClick={() => credit(child.id, reward.id, "Helpfulness")}>
                                <Plus size={14} /> Helpful
                              </button>
                              <button disabled={Boolean(pending)} onClick={() => credit(child.id, reward.id, "Routine complete")}>
                                <Plus size={14} /> Routine
                              </button>
                            </div>
                            <div className="goal-star-editor" aria-label={`${reward.title} target stars for ${child.fullName}`}>
                              <button
                                disabled={target.starsRequired <= 1 || Boolean(pending)}
                                onClick={() => adjustTargetStars(child.id, reward.id, target.starsRequired - 1)}
                                aria-label={`Reduce stars for ${reward.title}`}
                              >
                                -
                              </button>
                              <strong><Star size={13} /> {target.starsRequired}</strong>
                              <button
                                disabled={Boolean(pending)}
                                onClick={() => adjustTargetStars(child.id, reward.id, target.starsRequired + 1)}
                                aria-label={`Add star for ${reward.title}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="goal-actions">
                            {target.starsEarned >= target.starsRequired && !pending && (
                              <button onClick={() => requestReward(child.id, reward.id)}>Request</button>
                            )}
                            {pending && <span className="pending-chip">Pending</span>}
                            <button className="goal-remove" disabled={Boolean(pending)} onClick={() => removeTarget(child.id, reward.id)}>Remove</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="reward-catalog">
            <div className="section-heading">
              <div>
                <span>Kids choose</span>
                <h2>Reward targets</h2>
              </div>
            </div>
            <div className="reward-tile-grid">
              {dashboard.rewards.map((reward) => (
                <article className="reward-tile" key={reward.id}>
                  <RewardIcon iconKey={reward.iconKey} />
                  <h3>{reward.title}</h3>
                  <p>{reward.starsRequired} stars <small>default</small></p>
                  <span className="reward-category">{reward.category}</span>
                  <div className="target-buttons">
                    {dashboard.children.map((child) => {
                      const attached = dashboard.targets.some((target) => target.profileId === child.id && target.rewardId === reward.id);
                      return (
                        <button className={attached ? "attached" : ""} disabled={attached} key={child.id} onClick={() => selectTarget(child.id, reward.id)}>
                          {attached ? `${child.fullName}: added` : `Add for ${child.fullName}`}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-panel reward-admin">
            <div className="section-heading">
              <div>
                <span>Parents manage</span>
                <h2>Customize rewards</h2>
              </div>
            </div>
            <div className="reward-form">
              <input
                value={rewardForm.title}
                onChange={(event) => setRewardForm({ ...rewardForm, title: event.target.value })}
                placeholder="Reward title"
                aria-label="Reward title"
              />
              <input
                value={rewardForm.starsRequired}
                onChange={(event) => setRewardForm({ ...rewardForm, starsRequired: Number(event.target.value) })}
                type="number"
                min="1"
                aria-label="Stars required"
              />
              <select value={rewardForm.category} onChange={(event) => setRewardForm({ ...rewardForm, category: event.target.value as RewardCategory })}>
                {rewardCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={rewardForm.iconKey} onChange={(event) => setRewardForm({ ...rewardForm, iconKey: event.target.value as RewardIconKey })}>
                {rewardIcons.map((icon) => <option key={icon.key} value={icon.key}>{icon.label}</option>)}
              </select>
              <button onClick={createReward}>
                <Plus size={18} /> Add reward
              </button>
            </div>
            <div className="reward-edit-list">
              {dashboard.rewards.map((reward) => {
                const draft = rewardDrafts[reward.id] ?? reward;
                return (
                  <div className="reward-edit-row" key={reward.id}>
                    <RewardIcon iconKey={draft.iconKey} />
                    <input value={draft.title} onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, title: event.target.value } }))} />
                    <input value={draft.starsRequired} type="number" min="1" onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, starsRequired: Number(event.target.value) } }))} />
                    <select value={draft.category} onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, category: event.target.value as RewardCategory } }))}>
                      {rewardCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <select value={draft.iconKey} onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, iconKey: event.target.value as RewardIconKey } }))}>
                      {rewardIcons.map((icon) => <option key={icon.key} value={icon.key}>{icon.label}</option>)}
                    </select>
                    <button className="tiny-icon-button" onClick={() => saveReward(reward.id)} aria-label={`Save ${reward.title}`}>
                      <Save size={16} />
                    </button>
                    <button className="tiny-icon-button danger" onClick={() => deleteReward(reward.id)} aria-label={`Delete ${reward.title}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {dashboard.redemptions.some((redemption) => redemption.status === "PENDING") && (
            <section className="admin-panel approval-panel">
              <div className="section-heading">
                <div>
                  <span>Parents approve</span>
                  <h2>Reward requests</h2>
                </div>
              </div>
              {dashboard.redemptions
                .filter((redemption) => redemption.status === "PENDING")
                .map((redemption) => (
                  <article className="approval-row" key={redemption.id}>
                    <div>
                      <strong>{redemption.child?.fullName}</strong>
                      <p>{redemption.reward?.title} / {redemption.starsSpent} stars</p>
                    </div>
                    <button onClick={() => resolveReward(redemption.id, true)}>Approve</button>
                    <button className="secondary-button" onClick={() => resolveReward(redemption.id, false)}>Decline</button>
                  </article>
                ))}
            </section>
          )}
        </>
      )}
    </>
  );
}

function FinancePage() {
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [budgetDrafts, setBudgetDrafts] = useState<Partial<Record<ExpenseCategory, number>>>({});
  const [vendor, setVendor] = useState("REWE");
  const [amount, setAmount] = useState(50);
  const [category, setCategory] = useState<ExpenseCategory>("FOOD");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptFile, setReceiptFile] = useState<File | undefined>();
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false);
  const [financeNotice, setFinanceNotice] = useState("");

  useEffect(() => {
    loadDashboard(month);
    api.aiStatus().then(setAiStatus).catch((loadError) => setFinanceNotice(loadError instanceof Error ? loadError.message : "AI status could not be loaded."));
  }, [month]);

  async function loadDashboard(selectedMonth: string) {
    try {
      const data = await api.finance(selectedMonth);
      setDashboard(data);
      setBudgetDrafts(Object.fromEntries(data.budgets.map((budget) => [budget.category, budget.amount])));
    } catch (loadError) {
      setFinanceNotice(loadError instanceof Error ? loadError.message : "Finance dashboard could not be loaded.");
    }
  }

  async function addExpense() {
    const datedAt = expenseDate ? `${expenseDate}T12:00:00.000Z` : new Date().toISOString();
    const savedMonth = datedAt.slice(0, 7);
    try {
      if (receiptFile) {
        await api.addReceiptImage(vendor, amount, receiptFile, category, datedAt);
        setReceiptFile(undefined);
      } else {
        await api.addReceipt(vendor, amount, category, datedAt);
      }
      if (savedMonth !== month) {
        setMonth(savedMonth);
      }
      await loadDashboard(savedMonth);
      const categoryLabel = financeCategories.find((option) => option.value === category)?.label ?? category;
      setFinanceNotice(`Receipt saved in ${categoryLabel} for ${formatMonth(savedMonth)}.`);
    } catch (error) {
      setFinanceNotice(error instanceof Error ? error.message : "Receipt could not be saved.");
    }
  }

  async function deleteExpense(expenseId: string) {
    await api.deleteExpense(expenseId);
    await loadDashboard(month);
  }

  async function saveBudget(targetCategory: ExpenseCategory) {
    await api.saveBudget(month, targetCategory, budgetDrafts[targetCategory] ?? 0);
    await loadDashboard(month);
  }

  async function analyzeBill() {
    if (!receiptFile) {
      setFinanceNotice("Choose a bill picture before analysis.");
      return;
    }
    setAnalyzingReceipt(true);
    try {
      const analysis = await api.analyzeReceipt(receiptFile);
      setVendor(analysis.vendor);
      setAmount(analysis.amount);
      setCategory(analysis.category);
      setExpenseDate(analysis.date);
      setFinanceNotice(`Gemini extracted bill details (${Math.round(analysis.confidence * 100)}% confidence). Review and add receipt.`);
    } catch (error) {
      setFinanceNotice(error instanceof Error ? error.message : "Bill analysis failed.");
    } finally {
      setAnalyzingReceipt(false);
    }
  }

  const segments = useMemo(() => (dashboard ? makeDonutSegments(dashboard) : []), [dashboard]);

  return (
    <>
      <PageTitle eyebrow="Monthly view" title="Finance dashboard" />
      {dashboard && (
        <>
          {financeNotice && <div className="notice">{financeNotice}</div>}
          {aiStatus && (
            <div className={`ai-status ${aiStatus.enabled ? "ready" : ""}`}>
              <Sparkles size={17} />
              <span>{aiStatus.enabled ? `Gemini bill scan ready: ${aiStatus.model}` : "Add GEMINI_API_KEY to enable bill scan"}</span>
            </div>
          )}
          <div className="finance-month-toolbar">
            <label>
              Budget month
              <input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} aria-label="Budget month" />
            </label>
          </div>
          <section className="finance-hero">
            <svg viewBox="0 0 120 120" className="donut" role="img" aria-label="Spending by category">
              <circle cx="60" cy="60" r="43" fill="none" stroke="var(--color-surface-strong)" strokeWidth="16" />
              {segments.map((segment) => (
                <circle
                  key={segment.category}
                  cx="60"
                  cy="60"
                  r="43"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="16"
                  strokeDasharray={`${segment.length} ${segment.gap}`}
                  strokeDashoffset={segment.offset}
                  pathLength="100"
                  transform="rotate(-90 60 60)"
                />
              ))}
              <text x="60" y="56" textAnchor="middle" className="donut-total">
                EUR {dashboard.total.toFixed(0)}
              </text>
              <text x="60" y="72" textAnchor="middle" className="donut-label">
                {formatMonth(month)}
              </text>
            </svg>
            <div className="receipt-form">
              <input value={vendor} onChange={(event) => setVendor(event.target.value)} aria-label="Vendor" />
              <input value={amount} type="number" onChange={(event) => setAmount(Number(event.target.value))} aria-label="Amount" />
              <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)} aria-label="Expense category">
                {financeCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} aria-label="Expense date" />
              <label className="file-button">
                <Upload size={18} />
                {receiptFile ? receiptFile.name : "Bill picture"}
                <input type="file" accept="image/*,application/pdf" onChange={(event) => setReceiptFile(event.target.files?.[0])} />
              </label>
              <button className="secondary-button analyze-receipt-button" onClick={analyzeBill} disabled={analyzingReceipt || !receiptFile}>
                <Sparkles size={16} /> {analyzingReceipt ? "Analyzing..." : "Analyze with Gemini"}
              </button>
              <button onClick={addExpense}>Add receipt</button>
            </div>
          </section>
          <section className="budget-panel">
            <div className="section-heading">
              <div>
                <span>Monthly limits</span>
                <h2>Category budgets</h2>
              </div>
            </div>
            <div className="budget-grid">
              {dashboard.budgets.map((budget) => {
                const overBudget = budget.remaining < 0;
                const label = financeCategories.find((option) => option.value === budget.category)?.label ?? budget.category;
                return (
                  <article className={`budget-item ${overBudget ? "over" : ""}`} key={budget.category}>
                    <header>
                      <strong>{label}</strong>
                      <span>EUR {budget.spent.toFixed(0)} spent</span>
                    </header>
                    <div className="budget-track">
                      <span style={{ width: `${Math.min(budget.percentage, 100)}%` }} />
                    </div>
                    <p>{overBudget ? `EUR ${Math.abs(budget.remaining).toFixed(0)} over` : `EUR ${budget.remaining.toFixed(0)} remaining`}</p>
                    <div className="budget-edit">
                      <input
                        min="0"
                        type="number"
                        value={budgetDrafts[budget.category] ?? budget.amount}
                        onChange={(event) => setBudgetDrafts((current) => ({ ...current, [budget.category]: Number(event.target.value) }))}
                        aria-label={`${label} monthly budget`}
                      />
                      <button onClick={() => saveBudget(budget.category)} aria-label={`Save ${label} budget`}>
                        <Save size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <div className="stack">
            {dashboard.expenses.map((expense) => (
              <article className="ledger-row" key={expense.id}>
                <span className={`category-icon ${expense.category.toLowerCase()}`}>
                  {expense.category === "FOOD" ? <Utensils size={22} /> : expense.category === "GIFTS" ? <Gift size={22} /> : <Compass size={22} />}
                </span>
                <div>
                  <h2>{expense.vendor}</h2>
                  <p>{financeCategories.find((option) => option.value === expense.category)?.label ?? expense.category}{expense.receiptUrl ? " / picture saved" : ""}</p>
                </div>
                <strong>EUR {expense.amount.toFixed(2)}</strong>
                <button className="icon-button danger" onClick={() => deleteExpense(expense.id)} aria-label={`Delete ${expense.vendor} expense`}>
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function AdminPage({ goTo }: { goTo: (tab: Tab) => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileDrafts, setProfileDrafts] = useState<Record<string, { fullName: string; isParent: boolean }>>({});
  const [personName, setPersonName] = useState("");
  const [isParent, setIsParent] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [receiptVendor, setReceiptVendor] = useState("REWE");
  const [receiptAmount, setReceiptAmount] = useState(50);
  const [receiptFile, setReceiptFile] = useState<File | undefined>();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.bootstrap()
      .then((data) => {
        setProfiles(data.profiles);
        setProfileDrafts(makeProfileDrafts(data.profiles));
      })
      .catch((loadError) => setNotice(loadError instanceof Error ? loadError.message : "Admin data could not be loaded."));
  }, []);

  async function addPerson() {
    if (!personName.trim()) {
      return;
    }
    const created = await api.createProfile({ fullName: personName, isParent });
    setProfiles((current) => [...current, created]);
    setProfileDrafts((current) => ({ ...current, [created.id]: { fullName: created.fullName, isParent: created.isParent } }));
    setPersonName("");
    setNotice(`${created.fullName} added.`);
  }

  async function savePerson(profileId: string) {
    const draft = profileDrafts[profileId];
    if (!draft?.fullName.trim()) {
      return;
    }
    const updated = await api.updateProfile(profileId, draft);
    setProfiles((current) => current.map((profile) => (profile.id === profileId ? updated : profile)));
    setProfileDrafts((current) => ({ ...current, [profileId]: { fullName: updated.fullName, isParent: updated.isParent } }));
    setNotice(`${updated.fullName} updated.`);
  }

  async function addTask() {
    if (!taskTitle.trim()) {
      return;
    }
    await api.createTask({ title: taskTitle, assignedToId: taskAssignee || undefined });
    setTaskTitle("");
    setNotice("Task added.");
  }

  async function addBill() {
    await api.addReceiptImage(receiptVendor, receiptAmount, receiptFile);
    setReceiptFile(undefined);
    setNotice("Bill saved to finances.");
  }

  return (
    <>
      <PageTitle eyebrow="Household setup" title="Admin dashboard" />
      {notice && <div className="notice">{notice}</div>}
      <div className="admin-grid">
        <section className="admin-panel">
          <header className="panel-heading">
            <UserPlus size={22} />
            <h2>Add person</h2>
          </header>
          <div className="form-grid">
            <input value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Name" aria-label="Person name" />
            <label className="toggle-row">
              <input type="checkbox" checked={isParent} onChange={(event) => setIsParent(event.target.checked)} />
              Parent profile
            </label>
            <button onClick={addPerson}>
              <Plus size={18} /> Add person
            </button>
          </div>
          <div className="mini-list">
            {profiles.map((profile) => (
              <div className="member-edit-row" key={profile.id}>
                <input
                  value={profileDrafts[profile.id]?.fullName ?? profile.fullName}
                  onChange={(event) =>
                    setProfileDrafts((current) => ({
                      ...current,
                      [profile.id]: {
                        ...(current[profile.id] ?? { fullName: profile.fullName, isParent: profile.isParent }),
                        fullName: event.target.value
                      }
                    }))
                  }
                  aria-label={`Name for ${profile.fullName}`}
                />
                <label className="toggle-row compact-toggle">
                  <input
                    type="checkbox"
                    checked={profileDrafts[profile.id]?.isParent ?? profile.isParent}
                    onChange={(event) =>
                      setProfileDrafts((current) => ({
                        ...current,
                        [profile.id]: {
                          ...(current[profile.id] ?? { fullName: profile.fullName, isParent: profile.isParent }),
                          isParent: event.target.checked
                        }
                      }))
                    }
                  />
                  Parent
                </label>
                <button className="tiny-icon-button" onClick={() => savePerson(profile.id)} aria-label={`Save ${profile.fullName}`}>
                  <Save size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <header className="panel-heading">
            <ListTodo size={22} />
            <h2>Add task</h2>
          </header>
          <div className="form-grid">
            <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" aria-label="Task title" />
            <select value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)} aria-label="Task assignee">
              <option value="">Family pool</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
            </select>
            <button onClick={addTask}>
              <Plus size={18} /> Add task
            </button>
            <button className="secondary-button" onClick={() => goTo("tasks")}>
              Open task board
            </button>
          </div>
        </section>

        <section className="admin-panel">
          <header className="panel-heading">
            <Upload size={22} />
            <h2>Add bill picture</h2>
          </header>
          <div className="form-grid">
            <input value={receiptVendor} onChange={(event) => setReceiptVendor(event.target.value)} aria-label="Receipt vendor" />
            <input
              value={receiptAmount}
              type="number"
              onChange={(event) => setReceiptAmount(Number(event.target.value))}
              aria-label="Receipt amount"
            />
            <label className="file-button">
              <Upload size={18} />
              {receiptFile ? receiptFile.name : "Choose picture/PDF"}
              <input type="file" accept="image/*,application/pdf" onChange={(event) => setReceiptFile(event.target.files?.[0])} />
            </label>
            <button onClick={addBill}>Save bill</button>
            <button className="secondary-button" onClick={() => goTo("finances")}>
              Open finances
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function makePeople(profiles: Profile[]) {
  return [
    ...profiles.map((profile) => ({
      id: profile.id,
      name: profile.fullName,
      initials: profile.initials,
      role: profile.isParent ? "Parent" : "Child"
    })),
    { id: "pool", name: "Family pool", initials: "FM", role: "Unassigned" }
  ];
}

function makeRoutineDrafts(routines: RoutineView[]) {
  return Object.fromEntries(
    routines.flatMap((routine) =>
      routine.items.map((item) => [item.id, { title: item.title, assignedToId: item.assignee?.id ?? item.assignedToId ?? "" }])
    )
  );
}

function taskToDraft(task: TaskView) {
  return {
    title: task.title,
    description: task.description ?? "",
    assignedToId: task.assignee?.id ?? "",
    dueDate: dateToInput(task.dueDate)
  };
}

function makeTaskDrafts(tasks: TaskView[]) {
  return Object.fromEntries(tasks.map((task) => [task.id, taskToDraft(task)]));
}

function makeProfileDrafts(profiles: Profile[]) {
  return Object.fromEntries(profiles.map((profile) => [profile.id, { fullName: profile.fullName, isParent: profile.isParent }]));
}

function dateToInput(isoDate?: string) {
  return isoDate ? isoDate.slice(0, 10) : "";
}

function currentWeekday(): Weekday {
  return weekdays[(new Date().getDay() + 6) % 7];
}

function formatWeekday(weekday: Weekday) {
  return weekday[0] + weekday.slice(1).toLowerCase();
}

function makeDonutSegments(dashboard: FinanceDashboard) {
  const colors: Record<ExpenseCategory, string> = {
    FOOD: "var(--color-finance)",
    GIFTS: "var(--color-kids-strong)",
    MISCELLANEOUS: "var(--color-warning)",
    TRIPS: "var(--color-trips)",
    UTILITIES: "var(--color-primary-strong)",
    KIDS_GEAR: "var(--color-kids-strong)",
    MAINTENANCE: "var(--color-text-soft)",
    UNCATEGORIZED: "var(--color-danger)"
  };
  let offset = 0;
  return Object.entries(dashboard.totals)
    .filter(([, value]) => value > 0)
    .map(([category, value]) => {
      const length = (value / dashboard.total) * 100;
      const segment = {
        category,
        color: colors[category as ExpenseCategory],
        length,
        gap: 100 - length,
        offset: -offset
      };
      offset += length;
      return segment;
    });
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

function dateForPlanDay(startDate: string, day: number) {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatMealType(mealType: string) {
  return mealType[0] + mealType.slice(1).toLowerCase();
}
