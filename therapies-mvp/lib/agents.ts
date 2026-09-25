import fs from "node:fs";
import path from "node:path";
import { AGENTS, getAgentConfig, type AgentConfig } from "./agents-list";

export type { AgentConfig };
export { AGENTS, getAgentConfig };

export function getAgentSystemPrompt(agentId: string): string {
  const agent = getAgentConfig(agentId);
  if (!agent) {
    throw new Error(`Agent inconnu : ${agentId}`);
  }
  const promptPath = path.join(process.cwd(), "agents", agent.id, "system-prompt.md");
  return fs.readFileSync(promptPath, "utf-8");
}
