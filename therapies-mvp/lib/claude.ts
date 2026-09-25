import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY manquante dans l'environnement.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Appel générique à Claude pour un agent donné (system prompt dédié).
export async function callAgent(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Réponse de l'agent vide ou dans un format inattendu.");
    }
    return textBlock.text;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Erreur API Claude (${error.status}) : ${error.message}`);
    }
    throw error;
  }
}
