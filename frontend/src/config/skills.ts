import { icons } from "./icons";

export interface Skills {
  label: string;
  icon?: string;
}


export const language = [
  { label: "LANGUAGE", icon: icons.stack.language.language },
  { label: "HTML", icon: icons.stack.language.html },
  { label: "CSS", icon: icons.stack.language.css },
  { label: "JAVASCRIPT", icon: icons.stack.language.javascript },
  { label: "TYPESCRIPT", icon: icons.stack.language.typescript },
  { label: "JAVA", icon: icons.stack.language.java },
  { label: "DART", icon: icons.stack.language.dart },
  { label: "LUA", icon: icons.stack.language.lua },
] satisfies readonly Skills[];

export const frontend = [
  { label: "FRONTEND", icon: icons.stack.frontend.frontend },
  { label: "VUE.JS", icon: icons.stack.frontend.vuejs },
  { label: "VITE.JS", icon: icons.stack.frontend.vitejs },
  { label: "FLUTTER", icon: icons.stack.frontend.flutter },
  { label: "REACT", icon: icons.stack.frontend.react },
] satisfies readonly Skills[];

export const backend = [
  { label: "BACKEND", icon: icons.stack.backend.backend },
  { label: "NODE.JS", icon: icons.stack.backend.nodejs },
  { label: "SPRING BOOT", icon: icons.stack.backend.spring },
  { label: "JWT", icon: icons.stack.backend.jwt },
  { label: "SOCKET.IO", icon: icons.stack.backend.socketdotio },
] satisfies readonly Skills[];

export const database = [
  { label: "DATABASE", icon: icons.stack.database.database },
  { label: "MYSQL", icon: icons.stack.database.mysql },
  { label: "POSTGRESQL", icon: icons.stack.database.postgresql },
  { label: "MONGODB", icon: icons.stack.database.mongodb },
  { label: "FIREBASE", icon: icons.stack.database.firebase },
  // { label: "REDIS", icon: icons.stack.database.redis },
  // { label: "ORACLE", icon: icons.stack.database.oracle },
] satisfies readonly Skills[];

export const devops = [
  { label: "DEVOPS", icon: icons.stack.devops.devops },
  { label: "GITHUB ACTIONS", icon: icons.stack.devops.githubActions },
  { label: "DOCKER", icon: icons.stack.devops.docker },
  { label: "PM2", icon: icons.stack.devops.pm2 },
  { label: "NGINX", icon: icons.stack.devops.nginx },
  { label: "LINUX SERVER", icon: icons.stack.devops.linuxServer },
  { label: "NIFI", icon: icons.stack.devops.apacheNifi },
  { label: "MAVEN", icon: icons.stack.devops.maven },
] satisfies readonly Skills[];

export const tools = [
  { label: "TOOLS", icon: icons.stack.tool.tools },
  { label: "VISUAL STUDIO CODE", icon: icons.stack.tool.vscode },
  { label: "INTELLIJ IDEA", icon: icons.stack.tool.intellij },
  { label: "BUN", icon: icons.stack.frontend.bun },
  { label: "MAVEN", icon: icons.stack.devops.maven },
  { label: "MYSQL", icon: icons.stack.tool.mysql },
  { label: "POSTMAN", icon: icons.stack.tool.postman },
  { label: "GITHUB", icon: icons.stack.tool.github },
  { label: "GITHUB DESKTOP", icon: icons.stack.tool.github },
] satisfies readonly Skills[];

export const ux_ui = [
  { label: "UX / UI", icon: icons.stack.uxUi.uxUi },
  { label: "FIGMA", icon: icons.stack.uxUi.figma },
  { label: "CANVA", icon: icons.stack.uxUi.canva },
] satisfies readonly Skills[];

export const media_document = [
  { label: "MEDIA / DOCUMENT", icon: icons.stack.media.media },
  { label: "CAPCUT", icon: icons.stack.media.capcut },
  { label: "PHOTOSHOP", icon: icons.stack.media.photoshop },
  { label: "LIGHTROOM", icon: icons.stack.media.lightroom },
  { label: "MICROSOFT WORD", icon: icons.stack.media.word },
  { label: "POWERPOINT", icon: icons.stack.media.powerpoint },
  { label: "MICROSOFT EXCEL", icon: icons.stack.media.excel },
] satisfies readonly Skills[];

export const externalService = [
  { label: "EXTERNAL SERVICE", icon: icons.stack.service.externalService },
  { label: "GOOGLE AUTH", icon: icons.google },
  { label: "CLOUDINARY", icon: icons.stack.service.cloudinary },
  { label: "FIREBASE", icon: icons.stack.database.firebase },
  { label: "GEMINI API", icon: icons.stack.ai.gemini },
  { label: "OPEN ROUTER", icon: icons.stack.service.openrouter },
  { label: "EMAIL SERVICE", icon: icons.stack.service.sharpEmail },
  { label: "ETAX SIGN", icon: icons.stack.service.sign },
  { label: "ETAX SENDER", icon: icons.stack.service.fileSend },
  { label: "HSM", icon: icons.stack.service.hardwareSecurityModule },
  { label: "IAPP", icon: icons.stack.service.iapp },
  { label: "SMS GATEWAY", icon: icons.stack.service.sms },
  { label: "THAI SMS", icon: icons.stack.service.sms },
] satisfies readonly Skills[];
