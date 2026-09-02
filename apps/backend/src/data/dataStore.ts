import type { AppData } from "../domain/types.js";

export interface DataStore {
  read(): Promise<AppData>;
  update(mutator: (data: AppData) => void): Promise<AppData>;
}

