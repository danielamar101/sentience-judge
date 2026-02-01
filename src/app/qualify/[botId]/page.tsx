'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import QualificationForm from '@/components/QualificationForm';

interface Prompt {
  id: string;
  text: string;
  category: string;
}

interface Result {
  passed: boolean;
  judgeVerdict: string;
  judgeReasoning: string;
  message: string;
}

export default function QualifyPage({ params }: { params: Promise<{ botId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const startQualification = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/qualification/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ botId: resolvedParams.botId }),
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start qualification');
      }

      setPrompt(data.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.botId, router]);

  useEffect(() => {
    startQualification();
  }, [startQualification]);

  const handleSubmit = async (response: string) => {
    if (!prompt) return;

    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/qualification/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botId: resolvedParams.botId,
          promptId: prompt.id,
          humanResponse: response,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Qualification failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading qualification...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-indigo-400">
              Mirror Arena
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/dashboard" className="text-gray-400 hover:text-white">
              Dashboard
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300">Qualify</span>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-300">
            {error}
            <div className="mt-4">
              <Link href={`/dashboard/bot/${resolvedParams.botId}`}>
                <Button variant="secondary">Back to Bot</Button>
              </Link>
            </div>
          </div>
        )}

        {!error && !result && prompt && (
          <QualificationForm
            prompt={prompt}
            botId={resolvedParams.botId}
            onSubmit={handleSubmit}
            loading={submitting}
          />
        )}

        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center">
                {result.passed ? (
                  <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <h2
                className={`text-2xl font-bold mb-4 ${
                  result.passed ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {result.passed ? 'Qualification Passed!' : 'Qualification Failed'}
              </h2>
              <p className="text-gray-300 mb-6">{result.message}</p>

              <div className="bg-gray-800 rounded-lg p-4 text-left mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Judge&apos;s Reasoning</h3>
                <p className="text-gray-300">{result.judgeReasoning}</p>
              </div>

              <div className="flex justify-center gap-4">
                <Link href={`/dashboard/bot/${resolvedParams.botId}`}>
                  <Button variant="secondary">Back to Bot</Button>
                </Link>
                {result.passed && (
                  <Link href="/arena">
                    <Button>View Arena</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
