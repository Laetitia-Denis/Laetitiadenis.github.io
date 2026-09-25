import { NextRequest, NextResponse } from "next/server";
import { callAgent, type ChatMessage } from "../../../lib/claude";
import { getAgentSystemPrompt } from "../../../lib/agents";

export async function POST(request: NextRequest) {
  let body: { agentId?: string; messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const { agentId, messages } = body;
  if (!agentId || !messages || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: "Paramètres manquants : agentId et messages sont requis." },
      { status: 400 }
    );
  }

  try {
    const systemPrompt = getAgentSystemPrompt(agentId);
    const reply = await callAgent(systemPrompt, messages);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    const status = message.startsWith("Agent inconnu") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
