export function toDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function toWeekday(date = new Date()) {
  return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][date.getDay()] as
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
}

export function isOverdue(isoDate?: string): boolean {
  if (!isoDate) {
    return false;
  }

  const due = new Date(isoDate);
  const today = new Date();
  due.setHours(23, 59, 59, 999);
  return due < today;
}
