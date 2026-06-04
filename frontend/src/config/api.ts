// Which backend the app talks to.
// Flip `VITE_API_TARGET` in `.env`: "local" | "host".
// `VITE_API_BASE_URL`, if set, is a hard override (used by CI / production builds)
// and wins over the toggle.

const LOCAL_URL = (import.meta.env.VITE_API_LOCAL_URL as string | undefined)?.trim() || "http://localhost:8080";
const HOST_URL = (import.meta.env.VITE_API_HOST_URL as string | undefined)?.trim() || "https://api.fujipp.com";

const override = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const target = (import.meta.env.VITE_API_TARGET as string | undefined)?.trim().toLowerCase();

export const API_BASE_URL = override || (target === "host" ? HOST_URL : LOCAL_URL);
