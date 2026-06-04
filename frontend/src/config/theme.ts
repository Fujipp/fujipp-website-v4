export type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

export interface ThemeApp {
  mode: ThemeMode;
  src: string;
}

export const ThemeApp = [
  { mode: "LIGHT", src: "/images/icons/navbar/theme/light.svg" },
  { mode: "DARK", src: "/images/icons/navbar/theme/dark.svg" },
  { mode: "SYSTEM", src: "/images/icons/navbar/theme/system.svg" },
] satisfies readonly ThemeApp[];
