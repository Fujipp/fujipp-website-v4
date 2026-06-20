export interface NavbarLink {
  label: string;
  path: string;
  icon?: string;
}

export const navbarLinks = [
  { label: "HOME", path: "/", icon: "/images/icons/sidebar/home.svg" },
  { label: "PROJECTS", path: "/projects", icon: "/images/icons/sidebar/projects.svg" },
  { label: "ABOUT", path: "/about", icon: "/images/icons/sidebar/about.svg" },
  { label: "CONTACT", path: "/contact", icon: "/images/icons/sidebar/contact.svg" },
] satisfies readonly NavbarLink[];

export const mobileNavbarLinks = [
  ...navbarLinks,
  { label: "PERFORMANCE", path: "/performance", icon: "/images/icons/sidebar/performance.svg" },
  { label: "PRIVACY", path: "/privacy", icon: "/images/icons/sidebar/privacy.svg" },
] satisfies readonly NavbarLink[];
