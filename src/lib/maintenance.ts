import prisma from './db';

const MATCH_ARCHIVE_DAYS = 90;
const VOTE_ARCHIVE_DAYS = 30;

/**
 * Archive old matches and clean up storage
 */
export async function archiveOldMatches(): Promise<{
  deletedVotes: number;
  deletedMatches: number;
}> {
  const votesCutoff = new Date(Date.now() - VOTE_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
  const matchesCutoff = new Date(Date.now() - MATCH_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

  // Delete old judge votes (keep match results)
  const deletedVotes = await prisma.judgeVote.deleteMany({
    where: { createdAt: { lt: votesCutoff } },
  });

  // Archive old matches (or just delete for now)
  const deletedMatches = await prisma.arenaMatch.deleteMany({
    where: { createdAt: { lt: matchesCutoff } },
  });

  console.log(`Archived ${deletedVotes.count} votes and ${deletedMatches.count} matches`);

  return {
    deletedVotes: deletedVotes.count,
    deletedMatches: deletedMatches.count,
  };
}

/**
 * Clean up old qualification matches
 */
export async function cleanupQualificationMatches(): Promise<number> {
  const cutoff = new Date(Date.now() - MATCH_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

  const deleted = await prisma.qualificationMatch.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return deleted.count;
}

/**
 * Reinstate judges who have recovered
 * Bots regain judge status after 7 days if ELO > 1100
 */
export async function reinstateJudges(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const reinstated = await prisma.bot.updateMany({
    where: {
      isJudge: false,
      qualified: true,
      eloRating: { gte: 1100 },
      credibilityScore: { gte: 50 },
      judgeEligibleAt: { lt: sevenDaysAgo },
    },
    data: {
      isJudge: true,
    },
  });

  return reinstated.count;
}

/**
 * Run all maintenance tasks
 */
export async function runMaintenanceTasks(): Promise<{
  archivedVotes: number;
  archivedMatches: number;
  cleanedQualifications: number;
  reinstatedJudges: number;
}> {
  const [archived, cleanedQualifications, reinstatedJudges] = await Promise.all([
    archiveOldMatches(),
    cleanupQualificationMatches(),
    reinstateJudges(),
  ]);

  return {
    archivedVotes: archived.deletedVotes,
    archivedMatches: archived.deletedMatches,
    cleanedQualifications,
    reinstatedJudges,
  };
}
