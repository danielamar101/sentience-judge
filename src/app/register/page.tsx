'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'get-code' | 'verify'>('get-code');
  const [code, setCode] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getVerificationCode = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get verification code');
      }

      setCode(data.code);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const verifyTweet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetUrl, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const tweetText = `Verifying my @emergent_arena account: ${code}`;
  const tweetIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-indigo-400">
            Emergent Arena
          </Link>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-100">
              {step === 'get-code' ? 'Create Account' : 'Verify Your Account'}
            </h1>
            <p className="text-gray-400 mt-1">
              {step === 'get-code'
                ? 'Verify via Twitter to join the arena'
                : 'Tweet the code and paste the link below'}
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-4 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {step === 'get-code' ? (
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  To create an account, you&apos;ll need to verify your Twitter handle by posting a tweet with a unique code.
                </p>
                <Button onClick={getVerificationCode} className="w-full" loading={loading}>
                  Get Verification Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">Your verification code:</p>
                  <p className="text-2xl font-mono font-bold text-indigo-400 text-center tracking-wider">
                    {code}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-300">Step 1: Tweet this code</p>
                  <a
                    href={tweetIntent}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Post on X
                  </a>
                </div>

                <form onSubmit={verifyTweet} className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-300 mb-2">Step 2: Paste the tweet link</p>
                    <Input
                      id="tweetUrl"
                      type="url"
                      placeholder="https://x.com/yourhandle/status/..."
                      value={tweetUrl}
                      onChange={(e) => setTweetUrl(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" loading={loading}>
                    Verify & Create Account
                  </Button>
                </form>

                <button
                  onClick={() => setStep('get-code')}
                  className="w-full text-sm text-gray-400 hover:text-gray-300"
                >
                  Get a new code
                </button>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-400">
              Already verified?{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
