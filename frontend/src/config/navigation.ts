import { icons } from "./icons";

export interface NavbarLink {
  label: string;
  path: string;
  icon?: string;
}

export const guestNavbarLinks = [
  { label: "Home", path: "/", icon: icons.home },
  { label: "Projects", path: "/projects", icon: icons.projects },
  { label: "About", path: "/about", icon: icons.about },
] satisfies readonly NavbarLink[];

export const authenticatedNavbarLinks = [
  { label: "Home", path: "/", icon: icons.home },
  { label: "Store", path: "/store", icon: icons.package },
  { label: "My bot", path: "/my-bot", icon: icons.shopBot },
  { label: "Add credit", path: "/add-credit", icon: icons.wallet },
] satisfies readonly NavbarLink[];

/** @deprecated Choose guestNavbarLinks or authenticatedNavbarLinks from auth state. */
export const navbarLinks = guestNavbarLinks;
/** @deprecated Choose guestNavbarLinks or authenticatedNavbarLinks from auth state. */
export const mobileNavbarLinks = guestNavbarLinks;
