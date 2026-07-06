export interface Ai {
    name: string;
    src?: string;
    description: string;
}

export const aiModels = [
    { name: "Gemini", src: "/icons/stack/ai/gemini.svg", description: "Best for research, large documents, and Google Workspace integration." },
    { name: "Gpt", src: "/icons/stack/ai/openai.svg", description: "Best for all-around tasks like coding, productivity, and problem solving." },
    { name: "Claude", src: "/icons/stack/ai/claude.svg", description: "Best for coding, refactoring, and understanding large codebases." },
    { name: "Openclaw", src: "/icons/stack/ai/openclaw.svg", description: "AI agent framework for workflow automation and task execution." },
    { name: "Loveable", src: "/icons/stack/ai/lovable.svg", description: "AI-powered app builder for rapid frontend and MVP development." },
    { name: "Meshy.ai", src: "/icons/stack/ai/meshy.svg", description: "AI tool for generating 3D models, textures, and game assets." },
    { name: "Copilot", src: "/icons/stack/ai/github-copilot.svg", description: "AI coding assistant for code completion, debugging, and development support." }
] satisfies readonly Ai[];
