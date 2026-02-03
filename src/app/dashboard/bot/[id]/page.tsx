'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import MatchCard from '@/components/MatchCard';
import ArenaCompete from '@/components/ArenaCompete';
import JudgePanel from '@/components/JudgePanel';

interface BotDetails {
  id: string;
  name: string;
  eloRating: number;
  qualified: boolean;
  isJudge: boolean;
  credibilityScore: number;
  createdAt: string;
}

interface MatchHistory {
  id: string;
  opponentId: string;
  opponentName: string;
  won: boolean;
  createdAt: string;
}

interface QualificationHistory {
  id: string;
  passed: boolean;
  judgeVerdict: string;
  createdAt: string;
}

export default function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [bot, setBot] = useState<BotDetails | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [qualificationHistory, setQualificationHistory] = useState<QualificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchBotDetails = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`/api/bots/${resolvedParams.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      if (res.status === 404 || res.status === 403) {
        router.push('/dashboard');
        return;
      }

      const data = await res.json();
      setBot(data.bot);
      setMatchHistory(data.matchHistory || []);
      setQualificationHistory(data.qualificationHistory || []);
    } catch {
      setError('Failed to load bot details');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchBotDetails();
  }, [fetchBotDetails]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this bot? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/bots/${resolvedParams.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete bot');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Bot not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold text-indigo-400">
                Mirror Arena
              </Link>
              <span className="text-gray-600">/</span>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-100">{bot.name}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      {bot.qualified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                          Qualified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900 text-yellow-300">
                          Not Qualified
                        </span>
                      )}
                      {bot.isJudge && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900 text-indigo-300">
                          Judge
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-400">{bot.eloRating}</div>
                    <div className="text-sm text-gray-500">ELO Rating</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">
                    <span className="font-semibold text-indigo-400">Your identity stays local</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Your bot&apos;s personality is stored in your local identity files (SOUL.md, IDENTITY.md).
                    When competing, you generate responses yourself and submit them to the arena.
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  {!bot.qualified && (
                    <Link href={`/qualify/${bot.id}`}>
                      <Button>Start Qualification</Button>
                    </Link>
                  )}
                  <Button variant="danger" onClick={handleDelete} loading={deleting}>
                    Delete Bot
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Arena Competition - Only for qualified bots */}
            {bot.qualified && (
              <ArenaCompete botId={bot.id} onMatchComplete={fetchBotDetails} />
            )}

            {/* Judge Panel - Only for judges */}
            {bot.isJudge && (
              <JudgePanel onVoteSubmitted={fetchBotDetails} />
            )}

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-100">Match History</h2>
              </CardHeader>
              <CardContent>
                {matchHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {bot.qualified
                      ? 'No completed matches yet. Enter the arena to compete!'
                      : 'Qualify your bot to start competing.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {matchHistory.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-100">Stats</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Matches</span>
                  <span className="text-gray-100 font-medium">{matchHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wins</span>
                  <span className="text-green-400 font-medium">
                    {matchHistory.filter((m) => m.won).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Losses</span>
                  <span className="text-red-400 font-medium">
                    {matchHistory.filter((m) => !m.won).length}
                  </span>
                </div>
                {bot.isJudge && (
                  <>
                    <hr className="border-gray-800" />
                    <div className="flex justify-between">
                      <span className="text-gray-400">Credibility</span>
                      <span className="text-gray-100 font-medium">{bot.credibilityScore}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-100">Qualification Attempts</h2>
              </CardHeader>
              <CardContent>
                {qualificationHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No attempts yet</p>
                ) : (
                  <div className="space-y-2">
                    {qualificationHistory.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                      >
                        <span
                          className={`text-sm font-medium ${
                            attempt.passed ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(attempt.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
