import { describe, expect, it } from "vitest";
import { AGENTS } from "../lib/agents-list";
import { getAgentSystemPrompt } from "../lib/agents";

describe("registre d'agents", () => {
  it("expose exactement 5 agents avec des ids uniques", () => {
    expect(AGENTS).toHaveLength(5);
    const ids = new Set(AGENTS.map((a) => a.id));
    expect(ids.size).toBe(AGENTS.length);
  });

  it.each(AGENTS)("l'agent $id a un prompt système non vide qui interdit le vocabulaire médical", (agent) => {
    const prompt = getAgentSystemPrompt(agent.id);
    expect(prompt.length).toBeGreaterThan(50);
    // Chaque agent doit explicitement s'interdire le vocabulaire médical / la promesse de résultat thérapeutique.
    const lowerPrompt = prompt.toLowerCase();
    expect(lowerPrompt).toContain("jamais");
    expect(lowerPrompt).toContain("médical");
  });

  it("lève une erreur claire pour un agent inconnu", () => {
    expect(() => getAgentSystemPrompt("agent-inexistant")).toThrow("Agent inconnu");
  });
});
