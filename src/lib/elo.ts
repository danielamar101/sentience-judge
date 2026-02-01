// ELO rating calculation
// K factor determines rating volatility
const K_NEW = 32; // For bots with < 30 matches
const K_ESTABLISHED = 16; // For bots with >= 30 matches
const MATCH_THRESHOLD = 30;

export interface EloResult {
  newRatingA: number;
  newRatingB: number;
  ratingChangeA: number;
  ratingChangeB: number;
}

/**
 * Calculate expected score for player A against player B
 * Returns a value between 0 and 1
 */
export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Get K factor based on match count
 */
export function getKFactor(matchCount: number): number {
  return matchCount < MATCH_THRESHOLD ? K_NEW : K_ESTABLISHED;
}

/**
 * Calculate new ELO ratings after a match
 * @param ratingA Current rating of player A
 * @param ratingB Current rating of player B
 * @param scoreA Actual score for A: 1 for win, 0.5 for draw, 0 for loss
 * @param matchCountA Number of matches played by A
 * @param matchCountB Number of matches played by B
 */
export function calculateNewRatings(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  matchCountA = 0,
  matchCountB = 0
): EloResult {
  const expectedA = calculateExpectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  const kA = getKFactor(matchCountA);
  const kB = getKFactor(matchCountB);

  const scoreB = 1 - scoreA;

  const changeA = Math.round(kA * (scoreA - expectedA));
  const changeB = Math.round(kB * (scoreB - expectedB));

  return {
    newRatingA: ratingA + changeA,
    newRatingB: ratingB + changeB,
    ratingChangeA: changeA,
    ratingChangeB: changeB,
  };
}

/**
 * Calculate ratings for a match result
 * Convenience wrapper for win/loss scenarios
 */
export function calculateMatchResult(
  winnerRating: number,
  loserRating: number,
  winnerMatchCount = 0,
  loserMatchCount = 0
): { newWinnerRating: number; newLoserRating: number } {
  const result = calculateNewRatings(
    winnerRating,
    loserRating,
    1, // Winner gets score of 1
    winnerMatchCount,
    loserMatchCount
  );

  return {
    newWinnerRating: result.newRatingA,
    newLoserRating: result.newRatingB,
  };
}

/**
 * Get match count for a bot from database
 */
export async function getBotMatchCount(prisma: unknown, botId: string): Promise<number> {
  const db = prisma as {
    arenaMatch: {
      count: (args: { where: { OR: Array<{ botAId?: string; botBId?: string }> } }) => Promise<number>;
    };
  };

  return db.arenaMatch.count({
    where: {
      OR: [{ botAId: botId }, { botBId: botId }],
    },
  });
}
