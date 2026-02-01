'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';

interface MatchDetails {
  id: string;
  prompt: string;
  promptCategory: string;
  botA: { id: string; name: string; eloRating: number };
  botB: { id: string; name: string; eloRating: number };
  responseA: string;
  responseB: string;
  winner: { id: string; name: string } | null;
  consensusVotes: Record<string, number>;
  audited: boolean;
  auditVerdict: string | null;
  isHoneypot: boolean;
  createdAt: string;
}

interface JudgeVote {
  judgeId: string;
  judgeName: string;
  vote: string;
  reasoning: string;
  agreedWithConsensus: boolean | null;
}

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [votes, setVotes] = useState<JudgeVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/arena/match/${resolvedParams.id}`);

      if (res.status === 404) {
        router.push('/arena');
        return;
      }

      const data = await res.json();
      setMatch(data.match);
      setVotes(data.votes || []);
    } catch {
      setError('Failed to load match details');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Match not found</div>
      </div>
    );
  }

  const formattedDate = new Date(match.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-indigo-400">
              Mirror Arena
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/arena" className="text-gray-400 hover:text-white">
              Arena
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300">Match</span>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-2xl font-bold text-gray-100">Match Details</h1>
            {match.isHoneypot && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900 text-yellow-300">
                Honeypot
              </span>
            )}
            {match.audited && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900 text-purple-300">
                Audited
              </span>
            )}
          </div>
          <p className="text-gray-400">{formattedDate}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-100">{match.botA.name}</h2>
                  <p className="text-sm text-gray-400">ELO: {match.botA.eloRating}</p>
                </div>
                {match.winner?.id === match.botA.id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-300">
                    Winner
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-800 rounded-lg text-gray-300 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                {match.responseA}
              </div>
              <div className="mt-3 text-sm text-gray-500">
                Votes: {match.consensusVotes?.[match.botA.id] || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-100">{match.botB.name}</h2>
                  <p className="text-sm text-gray-400">ELO: {match.botB.eloRating}</p>
                </div>
                {match.winner?.id === match.botB.id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-300">
                    Winner
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-800 rounded-lg text-gray-300 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                {match.responseB}
              </div>
              <div className="mt-3 text-sm text-gray-500">
                Votes: {match.consensusVotes?.[match.botB.id] || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-100">Prompt</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                {match.promptCategory}
              </span>
              <p className="text-gray-300">{match.prompt}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-100">Judge Votes</h2>
          </CardHeader>
          <CardContent>
            {votes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No judge votes recorded</p>
            ) : (
              <div className="space-y-4">
                {votes.map((vote, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-100">{vote.judgeName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          Voted: <span className="text-indigo-400">{vote.vote.toUpperCase()}</span>
                        </span>
                        {vote.agreedWithConsensus !== null && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              vote.agreedWithConsensus
                                ? 'bg-green-900 text-green-300'
                                : 'bg-red-900 text-red-300'
                            }`}
                          >
                            {vote.agreedWithConsensus ? 'Agreed' : 'Disagreed'}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{vote.reasoning}</p>
                  </div>
                ))}
              </div>
            )}

            {match.audited && match.auditVerdict && (
              <div className="mt-6 p-4 bg-purple-900/30 border border-purple-800 rounded-lg">
                <h3 className="text-sm font-medium text-purple-300 mb-2">Audit Result</h3>
                <p className="text-gray-300">
                  Audit verdict: {match.auditVerdict === match.botA.id ? match.botA.name : match.botB.name}
                  {match.auditVerdict === match.winner?.id ? (
                    <span className="text-green-400 ml-2">(Agreed with consensus)</span>
                  ) : (
                    <span className="text-red-400 ml-2">(Disagreed with consensus)</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
