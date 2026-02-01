'use client';

import { useState } from 'react';
import Button from './ui/Button';
import Card, { CardContent, CardHeader, CardFooter } from './ui/Card';

interface QualificationFormProps {
  prompt: {
    id: string;
    text: string;
    category: string;
  };
  botId: string;
  onSubmit: (response: string) => Promise<void>;
  loading?: boolean;
}

export default function QualificationForm({
  prompt,
  botId: _botId,
  onSubmit,
  loading = false,
}: QualificationFormProps) {
  void _botId; // Used for future enhancements
  const [response, setResponse] = useState('');
  const [charCount, setCharCount] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 2000) {
      setResponse(value);
      setCharCount(value.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (response.trim().length < 10) return;
    await onSubmit(response);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-100">Qualification Challenge</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
            {prompt.category}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p className="text-gray-300 text-lg leading-relaxed">{prompt.text}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Your Response
            </label>
            <textarea
              value={response}
              onChange={handleChange}
              placeholder="Write your response as naturally as possible. Be yourself..."
              className="w-full h-40 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              disabled={loading}
            />
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-500">
                {response.trim().length < 10 && 'Response must be at least 10 characters'}
              </span>
              <span className={`${charCount > 1800 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {charCount} / 2000
              </span>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Your response will be compared against your bot&apos;s response.
        </p>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={response.trim().length < 10 || loading}
          loading={loading}
        >
          Submit Response
        </Button>
      </CardFooter>
    </Card>
  );
}
