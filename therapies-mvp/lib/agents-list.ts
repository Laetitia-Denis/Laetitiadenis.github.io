// Liste des agents, sans dépendance Node (fs) — importable côté client comme côté serveur.
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
}

import { config as alchimisteOffre } from "../agents/alchimiste-offre/config";
import { config as copywriterBienEtre } from "../agents/copywriter-bien-etre/config";
import { config as coachPositionnement } from "../agents/coach-positionnement/config";
import { config as assistantRdv } from "../agents/assistant-rdv/config";
import { config as coachPraticien } from "../agents/coach-praticien/config";

// Registre central des agents disponibles. Pour ajouter un agent :
// 1) créer /agents/<id>/system-prompt.md et config.ts
// 2) l'importer et l'ajouter à cette liste
export const AGENTS: AgentConfig[] = [
  alchimisteOffre,
  copywriterBienEtre,
  coachPositionnement,
  assistantRdv,
  coachPraticien,
];

export function getAgentConfig(agentId: string): AgentConfig | undefined {
  return AGENTS.find((agent) => agent.id === agentId);
}
