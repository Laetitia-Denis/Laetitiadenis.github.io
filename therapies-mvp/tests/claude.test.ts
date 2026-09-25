import { describe, expect, it, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: createMock };
    static APIError = class extends Error {
      status = 500;
    };
  }
  return { default: MockAnthropic };
});

describe("callAgent", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("retourne le texte de la réponse de l'agent", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "Voici une réponse d'accompagnement." }],
    });

    const { callAgent } = await import("../lib/claude");
    const reply = await callAgent("Tu es un agent de test.", [
      { role: "user", content: "Bonjour" },
    ]);

    expect(reply).toBe("Voici une réponse d'accompagnement.");
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("lève une erreur si la réponse ne contient pas de bloc texte", async () => {
    createMock.mockResolvedValue({ content: [] });

    const { callAgent } = await import("../lib/claude");
    await expect(
      callAgent("Tu es un agent de test.", [{ role: "user", content: "Bonjour" }])
    ).rejects.toThrow();
  });
});
