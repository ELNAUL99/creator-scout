import { answerFromFacts, buildCreatorDossier, dossierToFacts, isChannelStatsQuestion, isJudgmentQuestion } from "./creatorDossier";
import { llmFollowUp } from "./llm";
import type { ScoredCreator } from "./types";
import { ensureYoutubeResearch } from "./youtubeResearch";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function answerCreatorFollowUp(opts: {
  creator: ScoredCreator;
  history: ChatTurn[];
  question: string;
}) {
  const yt = await ensureYoutubeResearch(opts.creator.id, opts.creator.youtube);
  const creator: ScoredCreator = yt
    ? {
        ...opts.creator,
        youtube: yt,
        recentContent: yt.latestUploads,
        totalVideos: yt.videoCount || opts.creator.totalVideos,
        startedAt: yt.startedAt ?? opts.creator.startedAt,
        followers: yt.hiddenSubscribers ? opts.creator.followers : yt.subscriberCount || opts.creator.followers,
      }
    : opts.creator;
  const dossier = buildCreatorDossier(creator);
  const q = opts.question.trim().slice(0, 800);
  if (!q) return { answer: "Ask about last upload, average time between videos, or video length.", mode: "facts" as const };
  if (isChannelStatsQuestion(q) || !isJudgmentQuestion(q)) {
    return { answer: answerFromFacts(q, dossier), mode: "facts" as const };
  }
  const llm = await llmFollowUp({
    facts: dossierToFacts(dossier),
    history: opts.history,
    question: q,
  });
  if (llm) return { answer: llm, mode: "llm" as const };
  return { answer: answerFromFacts(q, dossier), mode: "facts" as const };
}
