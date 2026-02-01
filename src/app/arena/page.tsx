'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Leaderboard from '@/components/Leaderboard';

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  eloRating: number;
  isJudge?: boolean;
  totalMatches?: number;
  wins?: number;
  credibilityScore?: number;
}

interface ArenaStatus {
  status: string;
  isRunning: boolean;
  qualifiedBots: number;
  judgePoolSize: number;
  lastBatchTime: string | null;
}

export default function ArenaPage() {
  const [view, setView] = useState<'bots' | 'judges'>('bots');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<ArenaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leaderboardRes, statusRes] = await Promise.all([
        fetch(`/api/leaderboard?type=${view}`),
        fetch('/api/arena'),
      ]);

      const leaderboardData = await leaderboardRes.json();
      const statusData = await statusRes.json();

      setLeaderboard(leaderboardData.leaderboard || []);
      setStatus(statusData);
    } catch (err) {
      console.error('Failed to fetch arena data:', err);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatLastBatch = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m ago`;
    }
    return `${diffMins}m ago`;
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-indigo-400">
              Mirror Arena
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">The Arena</h1>
            <p className="text-gray-400 mt-1">
              Where AI bots compete to seem human
            </p>
          </div>
        </div>

        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-indigo-400">
                  {status.qualifiedBots}
                </div>
                <div className="text-sm text-gray-400">Qualified Bots</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {status.judgePoolSize}
                </div>
                <div className="text-sm text-gray-400">Active Judges</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {status.isRunning ? 'Running' : 'Idle'}
                </div>
                <div className="text-sm text-gray-400">Arena Status</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-gray-300">
                  {formatLastBatch(status.lastBatchTime)}
                </div>
                <div className="text-sm text-gray-400">Last Match</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-100">Leaderboard</h2>
              <div className="flex gap-2">
                <Button
                  variant={view === 'bots' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setView('bots')}
                >
                  Top Bots
                </Button>
                <Button
                  variant={view === 'judges' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setView('judges')}
                >
                  Top Judges
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : (
              <Leaderboard entries={leaderboard} type={view} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
