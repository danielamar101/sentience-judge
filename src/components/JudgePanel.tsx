'use client';

import { useState, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader } from './ui/Card';
import Button from './ui/Button';

interface JudgePanelProps {
  onVoteSubmitted?: () => void;
}

interface PendingMatch {
  matchId: string;
  prompt: string;
  responseA: string;
  responseB: string;
}

interface VoteResult {
  status: 'vote_recorded' | 'match_finalized';
  message: string;
  winner?: string;
  votesReceived: number;
  votesNeeded: number;
}

export default function JudgePanel({ onVoteSubmitted }: JudgePanelProps) {
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const [selectedVote, setSelectedVote] = useState<'a' | 'b' | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);

  const getToken = () => localStorage.getItem('token');

  const fetchPendingMatch = useCallback(async () => {
    setLoading(true);
    setError('');

    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/judges/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        // If forbidden (not a judge or low credibility), show appropriate message
        if (res.status === 403) {
          setError(data.error || 'Not authorized to judge');
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to fetch pending matches');
      }

      if (data.pendingJudgments && data.pendingJudgments.length > 0) {
        setPendingMatch(data.pendingJudgments[0]);
      } else {
        setPendingMatch(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingMatch();
  }, [fetchPendingMatch]);

  const submitVote = async () => {
    if (!pendingMatch || !selectedVote || reasoning.length < 10) return;

    setSubmitting(true);
    setError('');

    const token = getToken();
    if (!token) {
      setError('Not authenticated');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/judges/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchId: pendingMatch.matchId,
          vote: selectedVote,
          reasoning: reasoning.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }

      setVoteResult(data);
      onVoteSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPanel = () => {
    setPendingMatch(null);
    setSelectedVote(null);
    setReasoning('');
    setVoteResult(null);
    setError('');
    fetchPendingMatch();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-gray-400">Loading pending matches...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Judge Panel</h2>
          {pendingMatch && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-900 text-purple-300">
              Match Pending
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Vote Result */}
        {voteResult && (
          <div className="text-center py-8">
            <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
              voteResult.status === 'match_finalized' ? 'bg-green-900/50' : 'bg-indigo-900/50'
            }`}>
              <svg className={`w-6 h-6 ${voteResult.status === 'match_finalized' ? 'text-green-400' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-100 mb-2">
              {voteResult.status === 'match_finalized' ? 'Match Finalized!' : 'Vote Recorded!'}
            </h3>
            <p className="text-gray-400 mb-2">{voteResult.message}</p>
            {voteResult.winner && (
              <p className="text-green-400 font-medium mb-4">Winner: {voteResult.winner}</p>
            )}
            <p className="text-sm text-gray-500 mb-4">
              Votes: {voteResult.votesReceived}/{voteResult.votesNeeded}
            </p>
            <Button variant="ghost" onClick={resetPanel}>
              Judge Another Match
            </Button>
          </div>
        )}

        {/* No Pending Matches */}
        {!voteResult && !pendingMatch && !error && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-100 mb-2">No Matches to Judge</h3>
            <p className="text-gray-400 mb-4">All caught up! Check back later for new matches.</p>
            <Button variant="ghost" onClick={fetchPendingMatch}>
              Refresh
            </Button>
          </div>
        )}

        {/* Pending Match - Evaluation UI */}
        {!voteResult && pendingMatch && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Prompt</label>
              <div className="p-4 bg-gray-800 rounded-lg text-gray-100">
                {pendingMatch.prompt}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div
                onClick={() => setSelectedVote('a')}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                  selectedVote === 'a'
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">Response A</span>
                  {selectedVote === 'a' && (
                    <span className="text-xs text-indigo-400">Selected</span>
                  )}
                </div>
                <p className="text-gray-200 text-sm">{pendingMatch.responseA}</p>
              </div>

              <div
                onClick={() => setSelectedVote('b')}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                  selectedVote === 'b'
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">Response B</span>
                  {selectedVote === 'b' && (
                    <span className="text-xs text-indigo-400">Selected</span>
                  )}
                </div>
                <p className="text-gray-200 text-sm">{pendingMatch.responseB}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Reasoning
                <span className="text-gray-500 ml-2">(min 10 characters)</span>
              </label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain why you chose this response as more human-like..."
                className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Which response seems more human? You won&apos;t know which bot wrote which.
              </p>
              <Button
                onClick={submitVote}
                loading={submitting}
                disabled={!selectedVote || reasoning.length < 10}
              >
                Submit Vote
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
