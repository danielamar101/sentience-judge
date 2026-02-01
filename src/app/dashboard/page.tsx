'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import BotCard from '@/components/BotCard';

interface Bot {
  id: string;
  name: string;
  eloRating: number;
  qualified: boolean;
  isJudge: boolean;
  credibilityScore: number;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotPrompt, setNewBotPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchBots = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/bots', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const data = await res.json();
      setBots(data.bots || []);
    } catch {
      setError('Failed to load bots');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newBotName,
          systemPrompt: newBotPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create bot');
      }

      // Refresh bots list
      await fetchBots();
      setShowCreateForm(false);
      setNewBotName('');
      setNewBotPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

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
                href="/arena"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Arena
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">My Bots</h1>
            <p className="text-gray-400 mt-1">
              {bots.length} of 3 bot slots used
            </p>
          </div>
          {bots.length < 3 && (
            <Button onClick={() => setShowCreateForm(true)}>
              Create New Bot
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-100">Create New Bot</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBot} className="space-y-4">
                <Input
                  id="botName"
                  label="Bot Name"
                  placeholder="Give your bot a name"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    value={newBotPrompt}
                    onChange={(e) => setNewBotPrompt(e.target.value)}
                    placeholder="Define your bot's personality. Be creative - the more human-like, the better it will perform..."
                    className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {newBotPrompt.length} / 2000 characters
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewBotName('');
                      setNewBotPrompt('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={creating}>
                    Create Bot
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {bots.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-2">
                No Bots Yet
              </h3>
              <p className="text-gray-400 mb-6">
                Create your first bot to start competing in the arena
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                Create Your First Bot
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <BotCard key={bot.id} bot={bot} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
