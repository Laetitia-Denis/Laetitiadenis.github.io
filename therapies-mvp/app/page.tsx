"use client";

import { useState } from "react";
import { AGENTS } from "../lib/agents-list";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAgent = AGENTS.find((a) => a.id === agentId)!;
  const messages = messagesByAgent[agentId] || [];

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessagesByAgent((prev) => ({ ...prev, [agentId]: nextMessages }));
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur inconnue.");
      }
      setMessagesByAgent((prev) => ({
        ...prev,
        [agentId]: [...nextMessages, { role: "assistant", content: data.reply }],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <h1>Assistants Bien-être</h1>
      <p className="subtitle">Choisis un assistant et échange avec lui.</p>

      <div className="agent-picker">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            className={agent.id === agentId ? "active" : ""}
            onClick={() => setAgentId(agent.id)}
            type="button"
          >
            {agent.name}
          </button>
        ))}
      </div>

      <p className="agent-description">{activeAgent.description}</p>

      <div className="chat">
        <div className="messages">
          {messages.length === 0 && (
            <p className="agent-description">Écris ton premier message ci-dessous.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.content}
            </div>
          ))}
        </div>
        {error && <p className="status">{error}</p>}
        <form className="chat-form" onSubmit={sendMessage}>
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écris ton message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          <button type="submit" disabled={loading}>
            {loading ? "..." : "Envoyer"}
          </button>
        </form>
      </div>
    </main>
  );
}
