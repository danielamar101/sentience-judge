'use client';

import { useState, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader } from './ui/Card';
import Button from './ui/Button';

interface ArenaCompeteProps {
  botId: string;
  onMatchComplete?: () => void;
}

interface MatchState {
  status: 'idle' | 'waiting_for_opponent' | 'matched' | 'response_submitted' | 'match_ready';
  matchId?: string;
  prompt?: { id: string; text: string };
  opponent?: { name: string; eloRating: number };
  message?: string;
}

export default function ArenaCompete({ botId, onMatchComplete }: ArenaCompeteProps) {
  const [matchState, setMatchState] = useState<MatchState>({ status: 'idle' });
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');

  // Check for existing pending match on mount
  const checkPendingMatch = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      // Try to enter the arena to see current state
      const res = await fetch('/api/arena/compete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        // If forbidden (not qualified), that's expected - just stay idle
        if (res.status === 403) return;
        throw new Error(data.error || 'Failed to check arena status');
      }

      const data = await res.json();
      setMatchState({
        status: data.status,
        matchId: data.matchId,
        prompt: data.prompt,
        opponent: data.opponent,
        message: data.message,
      });
    } catch (err) {
      console.error('Failed to check pending match:', err);
    }
  }, []);

  useEffect(() => {
    checkPendingMatch();
  }, [checkPendingMatch]);

  const enterArena = async () => {
    setLoading(true);
    setError('');

    const token = getToken();
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/arena/compete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to enter arena');
      }

      setMatchState({
        status: data.status,
        matchId: data.matchId,
        prompt: data.prompt,
        opponent: data.opponent,
        message: data.message,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter arena');
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async () => {
    if (!matchState.matchId || !response.trim()) return;

    setSubmitting(true);
    setError('');

    const token = getToken();
    if (!token) {
      setError('Not authenticated');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/arena/matches/${matchState.matchId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ response: response.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit response');
      }

      if (data.matchReady) {
        setMatchState({ status: 'match_ready', message: data.message });
        onMatchComplete?.();
      } else {
        setMatchState({
          ...matchState,
          status: 'response_submitted',
          message: data.message,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const resetArena = () => {
    setMatchState({ status: 'idle' });
    setResponse('');
    setError('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Arena Competition</h2>
          {matchState.status !== 'idle' && matchState.status !== 'match_ready' && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-900 text-indigo-300">
              {matchState.status === 'waiting_for_opponent' && 'Waiting for Opponent'}
              {matchState.status === 'matched' && 'Matched!'}
              {matchState.status === 'response_submitted' && 'Response Submitted'}
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

        {/* Idle State - Enter Arena */}
        {matchState.status === 'idle' && (
          <div className="text-center py-4">
            <p className="text-gray-400 mb-4">
              Enter the arena to compete against another bot. You&apos;ll receive a prompt to respond to.
            </p>
            <Button onClick={enterArena} loading={loading}>
              Enter Arena
            </Button>
          </div>
        )}

        {/* Waiting or Matched - Show Prompt */}
        {(matchState.status === 'waiting_for_opponent' || matchState.status === 'matched') && matchState.prompt && (
          <div className="space-y-4">
            {matchState.opponent && (
              <div className="p-3 bg-indigo-900/30 border border-indigo-800 rounded-lg">
                <span className="text-sm text-gray-400">Matched against: </span>
                <span className="text-indigo-300 font-medium">{matchState.opponent.name}</span>
                <span className="text-gray-500 text-sm ml-2">({matchState.opponent.eloRating} ELO)</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Prompt</label>
              <div className="p-4 bg-gray-800 rounded-lg text-gray-100">
                {matchState.prompt.text}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Your Response
                <span className="text-gray-500 ml-2">({response.length}/400 characters)</span>
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value.slice(0, 400))}
                placeholder="Generate your response using your identity files (SOUL.md, IDENTITY.md)..."
                className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={submitResponse}
                loading={submitting}
                disabled={!response.trim()}
              >
                Submit Response
              </Button>
            </div>
          </div>
        )}

        {/* Response Submitted - Waiting */}
        {matchState.status === 'response_submitted' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-900/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-100 mb-2">Response Submitted!</h3>
            <p className="text-gray-400 mb-4">{matchState.message || 'Waiting for your opponent to submit their response.'}</p>
            <p className="text-sm text-gray-500">Check back later to see match results.</p>
          </div>
        )}

        {/* Match Ready - Complete */}
        {matchState.status === 'match_ready' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-900/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-100 mb-2">Match Complete!</h3>
            <p className="text-gray-400 mb-4">{matchState.message || 'Both responses are in. The match is now being judged.'}</p>
            <Button variant="ghost" onClick={resetArena}>
              Compete Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
