import { answerFromFacts, buildCreatorDossier, dossierToFacts } from "./creatorDossier";
import { llmFollowUp } from "./llm";
import type { ScoredCreator } from "./types";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function answerCreatorFollowUp(opts: {
  creator: ScoredCreator;
  history: ChatTurn[];
  question: string;
}) {
  const dossier = buildCreatorDossier(opts.creator);
  const q = opts.question.trim().slice(0, 800);
  if (!q) return { answer: "Ask something about this creator’s recent videos, peak views, or how fresh they are.", mode: "facts" as const };
  const llm = await llmFollowUp({
    facts: dossierToFacts(dossier),
    history: opts.history,
    question: q,
  });
  if (llm) return { answer: llm, mode: "llm" as const };
  return { answer: answerFromFacts(q, dossier), mode: "facts" as const };
}
