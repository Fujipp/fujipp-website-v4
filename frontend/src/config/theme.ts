export type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

export interface ThemeApp {
  mode: ThemeMode;
  src: string;
}

export const ThemeApp = [
  { mode: "LIGHT", src: "/images/icons/navbar/theme/mode_light.svg" },
  { mode: "DARK", src: "/images/icons/navbar/theme/mode_dark.svg" },
  { mode: "SYSTEM", src: "/images/icons/navbar/theme/mode_system.svg" },
] satisfies readonly ThemeApp[];
