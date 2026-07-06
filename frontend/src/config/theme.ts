import { icons } from "./icons";

export type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

export interface ThemeApp {
  mode: ThemeMode;
  src: string;
}

export const ThemeApp = [
  { mode: "LIGHT", src: icons.modeLight },
  { mode: "DARK", src: icons.modeDark },
  { mode: "SYSTEM", src: icons.modeSystem },
] satisfies readonly ThemeApp[];
