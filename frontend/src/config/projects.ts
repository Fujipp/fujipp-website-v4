import type { ProjectStatus } from "@/components/layout";

export type ProjectLocale = "en" | "th";

export interface ProjectStructuredItem {
  content: string;
  title: string;
}

export interface ProjectLocalizedContent {
  challenges: readonly ProjectStructuredItem[];
  description: string;
  descriptionShort: string;
  feasibility: string;
  features: readonly string[];
  projectName: string;
  targetUsers: string;
  whatILearned: readonly ProjectStructuredItem[];
}

export type ProjectLinkType = "github" | "youtube" | "certificate" | "figma";

export interface ProjectLink {
  type: ProjectLinkType;
  url: string;
}

export interface ProjectOverview {
  challengeAreas: number;
  coreRoles: number;
  stackGroup: number;
}

export interface ProjectTechStack {
  backend: readonly string[];
  database: readonly string[];
  devops: readonly string[];
  externalService: readonly string[];
  frontend: readonly string[];
  language: readonly string[];
}

export interface ProjectTimelineMilestone {
  date: string;
  description: string;
  title: string;
}

export interface ProjectTimeline {
  endDate: string;
  milestones: readonly ProjectTimelineMilestone[];
  startDate: string;
  status: "Completed" | "In Progress" | "On Hold";
}

export interface ProjectRecord {
  architectureImage: string;
  category: string;
  content: Record<ProjectLocale, ProjectLocalizedContent>;
  featured: boolean;
  gallery: readonly string[];
  id: string | number;
  links: readonly ProjectLink[];
  overview: ProjectOverview;
  roles: readonly string[];
  slug: string;
  stack: readonly string[];
  stackGroups: readonly ["frontend", "backend", "database"];
  status: ProjectStatus;
  techStack: ProjectTechStack;
  timeline: ProjectTimeline;
}

// Populated from Supabase after the project query layer is connected.
export const projects: readonly ProjectRecord[] = [];

export function getProjectById(id: string | number): ProjectRecord | undefined {
  return projects.find((project) => String(project.id) === String(id));
}
