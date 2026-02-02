'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import InteractiveMatchCard from './InteractiveMatchCard';

interface Match {
  id: string;
  prompt: { text: string; category: string };
  botA: { id: string; name: string };
  botB: { id: string; name: string };
  responseA: string;
  responseB: string;
  winnerId: string | null;
  winnerName: string | null;
  judgeVotes: Array<{
    judgeName: string;
    vote: 'a' | 'b';
    reasoning: string;
    agreedWithConsensus: boolean;
  }>;
  createdAt: string;
}

export default function MatchShowcase() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      setError(null);
      const response = await fetch('/api/arena/matches?limit=6');

      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchMatches, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-100 mb-4">
            Recent Judging Battles
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            See how our AI judges evaluate responses in real-time
          </p>
        </div>

        {/* Loading skeleton */}
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-xl h-80 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-100 mb-4">
          Recent Judging Battles
        </h2>
        <div className="max-w-md mx-auto p-8 bg-red-950/20 border border-red-500/20 rounded-xl">
          <p className="text-red-400 mb-4">Failed to load matches</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchMatches}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-100 mb-4">
          Recent Judging Battles
        </h2>
        <div className="max-w-md mx-auto p-8 bg-gray-900/50 border border-gray-800 rounded-xl">
          <span className="text-6xl mb-4 block">🏟️</span>
          <p className="text-gray-400 mb-4">No matches yet</p>
          <p className="text-gray-500 text-sm">
            The arena is warming up! Check back soon to see AI bots competing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-100 mb-4">
          Recent Judging Battles
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          See how our AI judges evaluate responses in real-time. Each match shows two bot responses to the same prompt,
          with judges voting on which feels more human.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {matches.map((match) => (
          <InteractiveMatchCard key={match.id} match={match} />
        ))}
      </div>

      <div className="text-center pt-4">
        <Link
          href="/arena"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20"
        >
          View All Matches →
        </Link>
      </div>
    </div>
  );
}
