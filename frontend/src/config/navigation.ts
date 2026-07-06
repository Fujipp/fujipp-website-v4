import { icons } from "./icons";

export interface NavbarLink {
  label: string;
  path: string;
  icon?: string;
}

export const navbarLinks = [
  { label: "HOME", path: "/", icon: icons.home },
  { label: "PROJECTS", path: "/projects", icon: icons.projects },
  { label: "ABOUT", path: "/about", icon: icons.about },
  { label: "SHOP", path: "/shop", icon: icons.shop },
] satisfies readonly NavbarLink[];

export const mobileNavbarLinks = [
  ...navbarLinks,
  // { label: "CONTACT", path: "/contact", icon: icons.contact },
  { label: "PERFORMANCE", path: "/performance", icon: icons.performance },
  { label: "PRIVACY", path: "/privacy", icon: icons.privacy },
] satisfies readonly NavbarLink[];
