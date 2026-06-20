export interface Skills {
  label: string;
  icon?: string;
}


export const language = [
  { label: "LANGUAGE", icon: "/images/icons/stacks/language/language.svg" },
  { label: "HTML", icon: "/images/icons/stacks/language/html.svg" },
  { label: "CSS", icon: "/images/icons/stacks/language/css.svg" },
  { label: "JAVASCRIPT", icon: "/images/icons/stacks/language/javascript.svg" },
  { label: "TYPESCRIPT", icon: "/images/icons/stacks/language/typescript.svg" },
  { label: "JAVA", icon: "/images/icons/stacks/language/java.svg" },
  { label: "SQL", icon: "/images/icons/stacks/language/sql.svg" },
  { label: "XML", icon: "/images/icons/stacks/language/xml.svg" },
  { label: "JSON", icon: "/images/icons/stacks/language/json.svg"},
  { label: "SHELL / BASH", icon: "/images/icons/stacks/language/shell.svg" },
  { label: "DART", icon: "/images/icons/stacks/language/dart.svg" },
  { label: "LUA", icon: "/images/icons/stacks/language/lua.svg" },
] satisfies readonly Skills[];

export const frontend = [
  { label: "FRONTEND", icon: "/images/icons/stacks/frontend/frontend.svg" },
  { label: "VUE.JS", icon: "/images/icons/stacks/frontend/vue.svg" },
  { label: "VITE.JS", icon: "/images/icons/stacks/frontend/vite.svg" },
  { label: "FLUTTER", icon: "/images/icons/stacks/frontend/flutter.svg" },
  { label: "REACT", icon: "/images/icons/stacks/frontend/react.svg" },
  { label: "TAILWIND CSS", icon: "/images/icons/stacks/frontend/tailwind.svg" },
] satisfies readonly Skills[];

export const backend = [
  { label: "BACKEND", icon: "/images/icons/stacks/backend/backend.svg" },
  { label: "NODE.JS", icon: "/images/icons/stacks/backend/node.svg" },
  { label: "SPRING BOOT", icon: "/images/icons/stacks/backend/spring.svg" },
  { label: "JWT", icon: "/images/icons/stacks/backend/jwt.svg" },
  { label: "SOCKET.IO", icon: "/images/icons/stacks/backend/socketio.svg" },
] satisfies readonly Skills[];

export const database = [
  { label: "DATABASE", icon: "/images/icons/stacks/database/database.svg" },
  { label: "MYSQL", icon: "/images/icons/stacks/database/mysql.svg" },
  { label: "POSTGRESQL", icon: "/images/icons/stacks/database/postgresql.svg" },
  { label: "MONGODB", icon: "/images/icons/stacks/database/mongodb.svg" },
  { label: "ORACLE", icon: "/images/icons/stacks/database/oracle.svg" },
  { label: "REDIS", icon: "/images/icons/stacks/database/redis.svg" },
] satisfies readonly Skills[];

export const devops = [
  { label: "DEVOPS", icon: "/images/icons/stacks/devops/devops.svg" },
  { label: "GITHUB ACTIONS", icon: "/images/icons/stacks/devops/github-actions.svg" },
  { label: "DOCKER", icon: "/images/icons/stacks/devops/docker.svg" },
  { label: "PM2", icon: "/images/icons/stacks/devops/pm2.svg" },
  { label: "NGINX", icon: "/images/icons/stacks/devops/nginx.svg" },
  { label: "LINUX SERVER", icon: "/images/icons/stacks/devops/linux-server.svg" },
  { label: "NIFI", icon: "/images/icons/stacks/devops/nifi.svg" },
  { label: "LINUX", icon: "/images/icons/stacks/devops/linux.svg" },
] satisfies readonly Skills[];

export const tools = [
  { label: "TOOLS", icon: "/images/icons/stacks/tools/tools.svg" },
  { label: "VISUAL STUDIO CODE", icon: "/images/icons/stacks/tools/vscode.svg" },
  { label: "INTELLIJ IDEA", icon: "/images/icons/stacks/tools/intellij.svg" },
  { label: "BUN", icon: "/images/icons/stacks/tools/bun.svg" },
  { label: "MAVEN", icon: "/images/icons/stacks/tools/maven.svg" },
  { label: "MYSQL", icon: "/images/icons/stacks/tools/mysql.svg" },
  { label: "POSTMAN", icon: "/images/icons/stacks/tools/postman.svg" },
  { label: "GITHUB", icon: "/images/icons/stacks/tools/github.svg" },
  { label: "GITHUB DESKTOP", icon: "/images/icons/stacks/tools/github-square.svg" },
] satisfies readonly Skills[];

export const ux_ui = [
  { label: "UX / UI", icon: "/images/icons/stacks/ux-ui/ux-ui.svg" },
  { label: "FIGMA", icon: "/images/icons/stacks/ux-ui/figma.svg" },
  { label: "CANVA", icon: "/images/icons/stacks/ux-ui/canva.svg" },
] satisfies readonly Skills[];

export const media_document = [
  { label: "MEDIA / DOCUMENT", icon: "/images/icons/stacks/media/media.svg" },
  { label: "CAPCUT", icon: "/images/icons/stacks/media/capcut.svg" },
  { label: "PHOTOSHOP", icon: "/images/icons/stacks/media/photoshop.svg" },
  { label: "LIGHTROOM", icon: "/images/icons/stacks/media/lightroom.svg" },
  { label: "MICROSOFT WORD", icon: "/images/icons/stacks/media/word.svg" },
  { label: "POWERPOINT", icon: "/images/icons/stacks/media/powerpoint.svg" },
  { label: "MICROSOFT EXCEL", icon: "/images/icons/stacks/media/excel.svg" },
] satisfies readonly Skills[];

export const externalService = [
  { label: "EXTERNAL SERVICE", icon: "/images/icons/stacks/service/service.svg" },
  { label: "GOOGLE AUTH", icon: "/images/icons/stacks/service/google.svg" },
  { label: "CLOUDINARY", icon: "/images/icons/stacks/service/cloudinary.svg" },
  { label: "FIREBASE", icon: "/images/icons/stacks/service/firebase.svg" },
  { label: "GEMINI API", icon: "/images/icons/stacks/ai/gemini.svg" },
  { label: "OPEN ROUTER", icon: "/images/icons/stacks/service/openrouter.svg" },
  { label: "EMAIL SERVICE", icon: "/images/icons/stacks/service/email-service.svg" },
  { label: "ETAX SIGN", icon: "/images/icons/stacks/service/etax-sign.svg" },
  { label: "ETAX SENDER", icon: "/images/icons/stacks/service/etax-sender.svg" },
  { label: "HSM", icon: "/images/icons/stacks/service/hardware-security-module.svg" },
  { label: "IAPP", icon: "/images/icons/stacks/service/iapp.svg" },
  { label: "SMS GATEWAY", icon: "/images/icons/stacks/service/sms-gateway.svg" },
  { label: "THAI SMS", icon: "/images/icons/stacks/service/thaisms.svg" },
] satisfies readonly Skills[];
