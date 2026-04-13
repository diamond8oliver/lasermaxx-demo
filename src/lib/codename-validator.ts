import {
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import { db } from "./db";
import { CODENAME_MAX_LENGTH, CODENAME_MIN_LENGTH } from "./constants";
import type { ValidationResult } from "@/types";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

function deLeetSpeak(str: string): string {
  return str
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
}

export async function validateCodename(
  codename: string,
  gameId: number,
  excludePlayerId?: number
): Promise<ValidationResult> {
  const normalized = codename.toUpperCase().trim();

  // Length check
  if (normalized.length < CODENAME_MIN_LENGTH) {
    return { valid: false, error: "CODENAME MUST BE AT LEAST 2 CHARACTERS" };
  }
  if (normalized.length > CODENAME_MAX_LENGTH) {
    return { valid: false, error: "CODENAME MUST BE 12 CHARACTERS OR LESS" };
  }

  // Alphanumeric only
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { valid: false, error: "LETTERS AND NUMBERS ONLY" };
  }

  // Obscenity library check
  if (matcher.hasMatch(normalized.toLowerCase())) {
    return { valid: false, error: "CODENAME NOT ALLOWED" };
  }

  // Leetspeak decode + recheck
  const deleeted = deLeetSpeak(normalized);
  if (matcher.hasMatch(deleeted)) {
    return { valid: false, error: "CODENAME NOT ALLOWED" };
  }

  // Custom blocked words from DB
  const blockedWords = await db.blockedWord.findMany();
  const lowerNorm = normalized.toLowerCase();
  const deleetedNorm = deleeted;

  for (const bw of blockedWords) {
    if (lowerNorm.includes(bw.word) || deleetedNorm.includes(bw.word)) {
      return { valid: false, error: "CODENAME NOT ALLOWED" };
    }
  }

  // Duplicate check within game
  const existing = await db.player.findFirst({
    where: {
      gameId,
      codename: normalized,
      status: { not: "rejected" },
      ...(excludePlayerId ? { id: { not: excludePlayerId } } : {}),
    },
  });
  if (existing) {
    return { valid: false, error: "CODENAME ALREADY TAKEN" };
  }

  return { valid: true };
}
