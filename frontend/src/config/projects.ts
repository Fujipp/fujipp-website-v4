import type { ProjectStatus } from "@/components/layout";

export type ProjectLocale = "en" | "th";

export interface ProjectLocalizedContent {
  challenges: string;
  description: string;
  descriptionShort: string;
  feasibility: string;
  features: readonly string[];
  projectName: string;
  targetUsers: string;
  whatILearned: readonly string[];
}

export type ProjectLinkType = "github" | "youtube";

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

export interface ProjectRecord {
  architectureImage: string;
  category: string;
  content: Record<ProjectLocale, ProjectLocalizedContent>;
  gallery: readonly string[];
  id: number;
  links: readonly ProjectLink[];
  overview: ProjectOverview;
  slug: string;
  stack: readonly string[];
  stackGroups: readonly ["frontend", "backend", "database"];
  status: ProjectStatus;
  techStack: ProjectTechStack;
}

const portfolioDescription = {
  en: {
    challenges:
      "The main challenge was keeping the portfolio flexible while the content model was still evolving. The project needed a responsive interface, bilingual content, authentication, reusable components, and a deployment flow without making each new project difficult to maintain.",
    description:
      "A full-stack personal platform for presenting projects, sharing technical experience, and managing bilingual portfolio content. The platform is designed around a clear data structure so each project can grow from a concise showcase into a detailed case study.",
    descriptionShort:
      "Full-stack portfolio platform with project showcase, authentication, and CI/CD deployment.",
    feasibility:
      "The core portfolio flow is feasible as an incremental delivery: define the project schema, publish responsive views, then connect Supabase content management and deployment automation.",
    features: [
      "Responsive project showcase",
      "Bilingual English and Thai content",
      "Project category and status filters",
      "Search by project, description, and stack",
      "Featured project highlights",
      "Supabase authentication",
      "Structured project detail pages",
      "CI/CD deployment workflow",
    ],
    projectName: "FUJIPP Portfolio Platform",
    targetUsers:
      "Recruiters, collaborators, and developers who want a concise overview of my work with the option to explore technical details.",
    whatILearned: [
      "Design project records around reusable content fields",
      "Separate responsive layouts without duplicating data",
      "Build reusable Vue components with typed props",
      "Use design tokens consistently across UI sections",
      "Plan bilingual content before connecting the database",
      "Connect project navigation through route parameters",
      "Keep deployment workflows incremental and maintainable",
    ],
  },
  th: {
    challenges:
      "ความท้าทายหลักคือการทำให้พอร์ตโฟลิโอยืดหยุ่นระหว่างที่โครงสร้างข้อมูลยังพัฒนาอยู่ ระบบต้องรองรับ responsive interface เนื้อหาสองภาษา การยืนยันตัวตน component ที่ใช้ซ้ำได้ และ deployment flow โดยไม่ทำให้การเพิ่มโปรเจกต์ใหม่ดูแลยาก",
    description:
      "แพลตฟอร์มพอร์ตโฟลิโอแบบ Full Stack สำหรับนำเสนอโปรเจกต์ แบ่งปันประสบการณ์ด้านเทคนิค และจัดการเนื้อหาสองภาษา โดยออกแบบโครงสร้างข้อมูลให้แต่ละโปรเจกต์ขยายจากข้อมูลสรุปไปเป็นกรณีศึกษาแบบละเอียดได้",
    descriptionShort:
      "แพลตฟอร์มพอร์ตโฟลิโอ Full Stack สำหรับแสดงโปรเจกต์ ระบบยืนยันตัวตน และ CI/CD deployment",
    feasibility:
      "สามารถพัฒนาเป็นลำดับได้ โดยเริ่มจากกำหนด schema ของโปรเจกต์ สร้างหน้า responsive เชื่อมต่อการจัดการเนื้อหาด้วย Supabase และเพิ่มระบบ deployment อัตโนมัติ",
    features: [
      "แสดงโปรเจกต์แบบ Responsive",
      "รองรับเนื้อหาภาษาอังกฤษและภาษาไทย",
      "กรองโปรเจกต์ตามหมวดหมู่และสถานะ",
      "ค้นหาจากชื่อ คำอธิบาย และ Stack",
      "แสดงโปรเจกต์เด่น",
      "ระบบยืนยันตัวตนด้วย Supabase",
      "หน้ารายละเอียดโปรเจกต์แบบมีโครงสร้าง",
      "ระบบ CI/CD deployment",
    ],
    projectName: "FUJIPP Portfolio Platform",
    targetUsers:
      "ผู้สรรหาบุคลากร ผู้ร่วมงาน และนักพัฒนาที่ต้องการดูภาพรวมผลงานอย่างกระชับ พร้อมเปิดอ่านรายละเอียดเชิงเทคนิคเพิ่มเติม",
    whatILearned: [
      "ออกแบบข้อมูลโปรเจกต์ให้ใช้ field ร่วมกันได้",
      "แยก responsive layout โดยไม่สร้างข้อมูลซ้ำ",
      "สร้าง Vue component แบบ reusable ด้วย typed props",
      "ใช้ design token ให้สม่ำเสมอในทุก section",
      "วางแผนเนื้อหาสองภาษาก่อนเชื่อมต่อฐานข้อมูล",
      "เชื่อมหน้าโปรเจกต์ผ่าน route parameter",
      "จัด deployment workflow ให้ขยายต่อได้ง่าย",
    ],
  },
} satisfies Record<ProjectLocale, ProjectLocalizedContent>;

function createPlaceholderContent(
  projectName: string,
  descriptionShort: string,
): Record<ProjectLocale, ProjectLocalizedContent> {
  return {
    en: {
      ...portfolioDescription.en,
      projectName,
      descriptionShort,
    },
    th: {
      ...portfolioDescription.th,
      projectName,
      descriptionShort,
    },
  };
}

export const projects = [
  {
    id: 1,
    slug: "fujipp-portfolio-platform",
    architectureImage: "/images/gallery/CC8DC2A3-362B-41E2-AB73-6437B48525CA.jpeg",
    category: "Personal Project",
    status: "Active",
    stack: ["Frontend", "Backend", "Database"],
    stackGroups: ["frontend", "backend", "database"],
    overview: {
      coreRoles: 2,
      challengeAreas: 4,
      stackGroup: 6,
    },
    techStack: {
      language: ["TYPESCRIPT", "SQL", "SHELL / BASH"],
      frontend: ["VUE.JS", "VITE.JS", "NODE.JS"],
      backend: ["SPRING BOOT", "JWT"],
      database: ["POSTGRESQL"],
      externalService: [],
      devops: ["GITHUB ACTIONS", "DOCKER", "NGINX"],
    },
    gallery: [
      "/images/gallery/IT D-Day-2026-Photo.jpg",
      "/images/gallery/09A067DF-8165-4C5B-9530-E9A1F8EA9C8C_1_102_o.jpeg",
      "/images/gallery/1962AD9C-8398-4D95-977F-B971631849FC_1_105_c.jpeg",
      "/images/gallery/48302A97-257E-407D-B2AF-EBC8F2E413D9_1_105_c.jpeg",
      "/images/gallery/78EA61AD-9376-4C6D-8662-8A7906A29CDA_1_105_c.jpeg",
    ],
    links: [
      { type: "github", url: "https://github.com/Fujipp/fujipp-personal-platform" },
      { type: "youtube", url: "https://www.youtube.com/" },
    ],
    content: portfolioDescription,
  },
  {
    id: 2,
    slug: "senior-project-system",
    architectureImage: "/images/gallery/A63ECB97-B67D-4C90-9580-A61FDAD41EF6_1_102_o.jpeg",
    category: "Senior Project",
    status: "Completed",
    stack: ["Frontend", "Backend", "Database"],
    stackGroups: ["frontend", "backend", "database"],
    overview: { coreRoles: 2, challengeAreas: 3, stackGroup: 3 },
    techStack: {
      language: ["TYPESCRIPT", "JAVA", "SQL"],
      frontend: ["VUE.JS", "VITE.JS"],
      backend: ["SPRING BOOT", "JWT"],
      database: ["POSTGRESQL"],
      externalService: [],
      devops: ["DOCKER"],
    },
    gallery: [
      "/images/education/KMUTT.jpeg",
      "/images/gallery/2F10CE6E-3C9D-4721-8787-FD6A248647E1.jpeg",
      "/images/gallery/5E41C9D6-4D69-4BDF-8F54-08496F6912FD_1_105_c.jpeg",
      "/images/gallery/A63ECB97-B67D-4C90-9580-A61FDAD41EF6_1_102_o.jpeg",
      "/images/gallery/CB85F78D-BEB8-4672-9E79-DAD45E1EB566_1_105_c.jpeg",
    ],
    links: [{ type: "github", url: "https://github.com/Fujipp" }],
    content: {
      en: {
        ...portfolioDescription.en,
        projectName: "Senior Project System",
        descriptionShort:
          "Graduation project focused on practical product workflows, backend services, and responsive interfaces.",
      },
      th: {
        ...portfolioDescription.th,
        projectName: "Senior Project System",
        descriptionShort:
          "โปรเจกต์จบที่เน้น workflow ของผลิตภัณฑ์ บริการ backend และ responsive interface",
      },
    },
  },
  {
    id: 3,
    slug: "interactive-lab",
    architectureImage: "/images/gallery/E0337789-CF8B-460C-853F-9DABB9DDCE77_1_102_o.jpeg",
    category: "Experimental",
    status: "In Progress",
    stack: ["Frontend", "Backend", "Database"],
    stackGroups: ["frontend", "backend", "database"],
    overview: { coreRoles: 2, challengeAreas: 4, stackGroup: 3 },
    techStack: {
      language: ["TYPESCRIPT", "JAVASCRIPT"],
      frontend: ["VUE.JS", "VITE.JS", "REACT"],
      backend: ["JWT"],
      database: ["POSTGRESQL"],
      externalService: [],
      devops: [],
    },
    gallery: [
      "/images/gallery/48302A97-257E-407D-B2AF-EBC8F2E413D9_1_105_c.jpeg",
      "/images/gallery/CC8DC2A3-362B-41E2-AB73-6437B48525CA.jpeg",
      "/images/gallery/E0337789-CF8B-460C-853F-9DABB9DDCE77_1_102_o.jpeg",
      "/images/gallery/1C545BA4-9489-45A4-AC7A-C50580C21F21.jpeg",
      "/images/gallery/78EA61AD-9376-4C6D-8662-8A7906A29CDA_1_105_c.jpeg",
    ],
    links: [],
    content: createPlaceholderContent(
      "Interactive Lab",
      "Prototype space for testing interactive UI patterns, animation ideas, and modern frontend tooling.",
    ),
  },
  {
    id: 4,
    slug: "backend-playground",
    architectureImage: "/images/gallery/09A067DF-8165-4C5B-9530-E9A1F8EA9C8C_1_102_o.jpeg",
    category: "Personal Project",
    status: "Archived",
    stack: ["Frontend", "Backend", "Database"],
    stackGroups: ["frontend", "backend", "database"],
    overview: { coreRoles: 1, challengeAreas: 3, stackGroup: 3 },
    techStack: {
      language: ["JAVA", "SQL", "SHELL / BASH"],
      frontend: [],
      backend: ["SPRING BOOT", "JWT"],
      database: ["POSTGRESQL", "MYSQL"],
      externalService: [],
      devops: ["DOCKER"],
    },
    gallery: [
      "/images/gallery/2F10CE6E-3C9D-4721-8787-FD6A248647E1.jpeg",
      "/images/gallery/09A067DF-8165-4C5B-9530-E9A1F8EA9C8C_1_102_o.jpeg",
      "/images/gallery/1962AD9C-8398-4D95-977F-B971631849FC_1_105_c.jpeg",
      "/images/gallery/A63ECB97-B67D-4C90-9580-A61FDAD41EF6_1_102_o.jpeg",
      "/images/gallery/CB85F78D-BEB8-4672-9E79-DAD45E1EB566_1_105_c.jpeg",
    ],
    links: [{ type: "github", url: "https://github.com/Fujipp" }],
    content: createPlaceholderContent(
      "Backend Playground",
      "Practice project for API design, authentication flows, database integration, and deployment experiments.",
    ),
  },
  {
    id: 5,
    slug: "ui-systems-practice",
    architectureImage: "/images/gallery/1C545BA4-9489-45A4-AC7A-C50580C21F21.jpeg",
    category: "Personal Project",
    status: "Archived",
    stack: ["Frontend", "Backend", "Database"],
    stackGroups: ["frontend", "backend", "database"],
    overview: { coreRoles: 1, challengeAreas: 3, stackGroup: 3 },
    techStack: {
      language: ["HTML", "CSS", "TYPESCRIPT"],
      frontend: ["VUE.JS", "VITE.JS", "TAILWIND CSS"],
      backend: [],
      database: [],
      externalService: [],
      devops: [],
    },
    gallery: [
      "/images/gallery/5E41C9D6-4D69-4BDF-8F54-08496F6912FD_1_105_c.jpeg",
      "/images/gallery/CC8DC2A3-362B-41E2-AB73-6437B48525CA.jpeg",
      "/images/gallery/E0337789-CF8B-460C-853F-9DABB9DDCE77_1_102_o.jpeg",
      "/images/gallery/1C545BA4-9489-45A4-AC7A-C50580C21F21.jpeg",
      "/images/gallery/78EA61AD-9376-4C6D-8662-8A7906A29CDA_1_105_c.jpeg",
    ],
    links: [],
    content: createPlaceholderContent(
      "UI Systems Practice",
      "Interface practice project for responsive layouts, reusable components, and design token workflows.",
    ),
  },
] satisfies readonly ProjectRecord[];

export function getProjectById(id: string | number): ProjectRecord | undefined {
  return projects.find((project) => project.id === Number(id));
}
