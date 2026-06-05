export interface Ai {
    name: string;
    src?: string;
    description: string;
}

export const aiModels = [
    { name: "Gemini", src: "/images/icons/stacks/ai/gemini.svg", description: "Best for research, large documents, and Google Workspace integration." },
    { name: "Gpt", src: "/images/icons/stacks/ai/openai.svg", description: "Best for all-around tasks like coding, productivity, and problem solving." },
    { name: "Claude", src: "/images/icons/stacks/ai/claude.svg", description: "Best for coding, refactoring, and understanding large codebases." },
    { name: "Openclaw", src: "/images/icons/stacks/ai/openclaw.svg", description: "AI agent framework for workflow automation and task execution." },
    { name: "Loveable", src: "/images/icons/stacks/ai/loveable.svg", description: "AI-powered app builder for rapid frontend and MVP development." },
    { name: "Meshy.ai", src: "/images/icons/stacks/ai/meshy.svg", description: "AI tool for generating 3D models, textures, and game assets." },
    { name: "Copilot", src: "/images/icons/stacks/ai/copilot.svg", description: "AI coding assistant for code completion, debugging, and development support." }
] satisfies readonly Ai[];
