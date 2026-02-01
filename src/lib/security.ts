import { createHash } from 'crypto';
import prisma from './db';

// Anomaly detection thresholds
const SAME_BOT_VOTE_THRESHOLD = 10; // Flag if voting for same bot > 10 times in recent 50
const POSITION_BIAS_THRESHOLD = 0.8; // Flag if > 80% position bias
const AUDIT_AGREEMENT_THRESHOLD = 0.5; // Flag if < 50% audit agreement

export interface AnomalyFlag {
  type: 'POTENTIAL_COLLUSION' | 'POSITION_BIAS' | 'AUDIT_DISAGREEMENT' | 'RESPONSE_SIMILARITY';
  judgeId?: string;
  details: string;
}

/**
 * Generate a fingerprint for a response to detect plagiarism
 */
export function getResponseFingerprint(response: string): string {
  // Normalize: lowercase, remove punctuation, sort words
  const normalized = response
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2) // Ignore short words
    .sort()
    .join(' ');

  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Check if two responses are too similar (potential plagiarism)
 */
export function checkResponseSimilarity(responseA: string, responseB: string): boolean {
  const fpA = getResponseFingerprint(responseA);
  const fpB = getResponseFingerprint(responseB);
  return fpA === fpB;
}

/**
 * Detect voting anomalies for a judge bot
 */
export async function detectAnomalies(judgeBotId: string): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  // Get recent votes
  const recentVotes = await prisma.judgeVote.findMany({
    where: { judgeBotId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      match: true,
    },
  });

  if (recentVotes.length < 10) {
    return flags; // Not enough data
  }

  // Check for voting for same bot too often
  const voteCounts = new Map<string, number>();
  for (const vote of recentVotes) {
    const labelAssignment = vote.labelAssignment as { a: string; b: string };
    const votedForBotId = vote.vote === 'a' ? labelAssignment.a : labelAssignment.b;
    voteCounts.set(votedForBotId, (voteCounts.get(votedForBotId) || 0) + 1);
  }

  for (const [botId, count] of voteCounts) {
    if (count > SAME_BOT_VOTE_THRESHOLD) {
      flags.push({
        type: 'POTENTIAL_COLLUSION',
        judgeId: judgeBotId,
        details: `Voted for bot ${botId} ${count} times in last 50 matches`,
      });
    }
  }

  // Check for position bias (always voting A or B)
  const positionACounts = recentVotes.filter((v) => v.vote === 'a').length;
  const positionBias = Math.max(positionACounts, recentVotes.length - positionACounts) / recentVotes.length;

  if (positionBias > POSITION_BIAS_THRESHOLD) {
    flags.push({
      type: 'POSITION_BIAS',
      judgeId: judgeBotId,
      details: `Position bias of ${(positionBias * 100).toFixed(1)}% detected`,
    });
  }

  // Check audit agreement rate
  const agreedVotes = recentVotes.filter((v) => v.agreedWithConsensus === true);
  const disagreedVotes = recentVotes.filter((v) => v.agreedWithConsensus === false);
  const totalRatedVotes = agreedVotes.length + disagreedVotes.length;

  if (totalRatedVotes >= 10) {
    const agreementRate = agreedVotes.length / totalRatedVotes;
    if (agreementRate < AUDIT_AGREEMENT_THRESHOLD) {
      flags.push({
        type: 'AUDIT_DISAGREEMENT',
        judgeId: judgeBotId,
        details: `Audit agreement rate of ${(agreementRate * 100).toFixed(1)}%`,
      });
    }
  }

  return flags;
}

/**
 * Log anomaly flags for review
 */
export async function logAnomalyFlags(flags: AnomalyFlag[]): Promise<void> {
  for (const flag of flags) {
    console.warn(`ANOMALY DETECTED: ${flag.type}`, flag);
    // In production, you might want to store these in a dedicated table
    // or send alerts
  }
}

/**
 * Check if a judge should be flagged for review
 */
export async function shouldFlagJudge(judgeBotId: string): Promise<boolean> {
  const flags = await detectAnomalies(judgeBotId);
  return flags.length > 0;
}

/**
 * Generate an obviously robotic response for honeypot matches
 */
export function generateRoboticResponse(prompt: string): string {
  const templates = [
    `Thank you for your inquiry regarding "${prompt.slice(0, 50)}". I would be happy to assist you with this matter. Please provide any additional information you feel is relevant.`,
    `I appreciate your question. As an AI assistant, I am designed to help with a wide range of topics. In response to your query: ${prompt.slice(0, 30)}...`,
    `I understand you are asking about this topic. Let me provide you with a comprehensive and accurate response to the best of my abilities.`,
    `Your question is an interesting one. I will attempt to address it thoroughly while maintaining objectivity and accuracy.`,
    `I am here to help. Based on my training data, I can provide the following information regarding your inquiry.`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Check if IP addresses are in the same cluster
 * Simple heuristic: same /24 subnet
 */
export function areIPsInSameCluster(ip1: string, ip2: string): boolean {
  const parts1 = ip1.split('.');
  const parts2 = ip2.split('.');

  if (parts1.length !== 4 || parts2.length !== 4) {
    return false;
  }

  return parts1[0] === parts2[0] && parts1[1] === parts2[1] && parts1[2] === parts2[2];
}

/**
 * Check if emails are from the same domain
 */
export function areEmailsSameDomain(email1: string, email2: string): boolean {
  const domain1 = email1.split('@')[1]?.toLowerCase();
  const domain2 = email2.split('@')[1]?.toLowerCase();
  return domain1 === domain2 && domain1 !== undefined;
}
