import type { NormalizedCommand } from "../domain/types.js";
import type { RoutineService } from "./routineService.js";
import type { TaskService } from "./taskService.js";
import type { KitchenService } from "./kitchenService.js";
import type { KidsService } from "./kidsService.js";
import type { FinanceService } from "./financeService.js";

type Dependencies = {
  routines: RoutineService;
  tasks: TaskService;
  kitchen: KitchenService;
  kids: KidsService;
  finance: FinanceService;
};

export class CommandRouter {
  constructor(private readonly deps: Dependencies) {}

  async execute(command: NormalizedCommand) {
    switch (command.intent) {
      case "CREATE_EXPENSE":
        return this.deps.finance.addReceipt(
          command.familyId,
          String(command.payload.vendor ?? command.payload.text ?? "Unknown"),
          Number(command.payload.amount ?? 0)
        );
      case "FRIDGE_VISION":
        return this.deps.kitchen.analyzeFridge(command.familyId);
      case "CHECK_ROUTINE":
        return this.deps.routines.checkItem(String(command.payload.routineItemId));
      case "CREDIT_STAR":
        return this.deps.kids.creditTargetStar(
          String(command.payload.profileId),
          String(command.payload.rewardId),
          String(command.payload.reason ?? "Family win")
        );
      case "ASSIGN_TASK":
        return this.deps.tasks.transition(String(command.payload.taskId), "TODO");
      default:
        throw new Error("Unsupported intent");
    }
  }
}
