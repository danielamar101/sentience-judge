'use client';

import { useState } from 'react';

interface InteractiveMatchCardProps {
  match: {
    id: string;
    type?: 'arena' | 'qualification';
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
  };
}

export default function InteractiveMatchCard({ match }: InteractiveMatchCardProps) {
  const [expandedA, setExpandedA] = useState(false);
  const [expandedB, setExpandedB] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const isAWinner = match.winnerId === match.botA.id;
  const isBWinner = match.winnerId === match.botB.id;
  const isQualificationMatch = match.type === 'qualification';

  // Get category color
  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('philos')) return 'from-violet-500 to-purple-500';
    if (lower.includes('creat')) return 'from-fuchsia-500 to-pink-500';
    if (lower.includes('logic')) return 'from-cyan-500 to-blue-500';
    return 'from-amber-500 to-yellow-500';
  };

  // Get time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Preview text (first 150 chars)
  const getPreviewText = (text: string) => {
    if (text.length <= 150) return text;
    return text.substring(0, 150) + '...';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      {/* Prompt Section */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1">
            <p className="text-gray-200 leading-relaxed">{match.prompt.text}</p>
          </div>
          <span className="text-gray-500 text-sm whitespace-nowrap">
            {getTimeAgo(match.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getCategoryColor(
              match.prompt.category
            )} text-white`}
          >
            {match.prompt.category}
          </span>
          {match.type === 'qualification' && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white">
              🤖 Bot vs Human
            </span>
          )}
        </div>
      </div>

      {/* Responses Section */}
      <div className="grid md:grid-cols-2 divide-x divide-gray-800">
        {/* Response A */}
        <div
          className={`p-6 transition-all ${
            isAWinner
              ? 'bg-green-500/5 border-l-2 border-green-500/50'
              : 'bg-gray-900/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="font-semibold text-gray-200">
              {match.botA.id === 'human' ? '👤 ' : ''}
              {match.botA.name}
            </span>
            {isAWinner && <span className="text-lg">👑</span>}
          </div>
          <div className="text-gray-400 text-sm leading-relaxed mb-3">
            {expandedA ? match.responseA : getPreviewText(match.responseA)}
          </div>
          {match.responseA.length > 150 && (
            <button
              onClick={() => setExpandedA(!expandedA)}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              aria-label={expandedA ? 'Show less' : 'Read more'}
            >
              {expandedA ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Response B */}
        <div
          className={`p-6 transition-all ${
            isBWinner
              ? 'bg-green-500/5 border-r-2 border-green-500/50'
              : 'bg-gray-900/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="font-semibold text-gray-200">
              {match.botB.id === 'human' ? '👤 ' : ''}
              {match.botB.name}
            </span>
            {isBWinner && <span className="text-lg">👑</span>}
          </div>
          <div className="text-gray-400 text-sm leading-relaxed mb-3">
            {expandedB ? match.responseB : getPreviewText(match.responseB)}
          </div>
          {match.responseB.length > 150 && (
            <button
              onClick={() => setExpandedB(!expandedB)}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              aria-label={expandedB ? 'Show less' : 'Read more'}
            >
              {expandedB ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      </div>

      {/* Judge Reasoning Section */}
      {match.judgeVotes.length > 0 && (
        <div className="border-t border-gray-800">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="w-full px-6 py-3 text-left flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            aria-expanded={showReasoning}
          >
            <span className="text-sm font-medium text-gray-300">
              {showReasoning ? '▼' : '▶'} Why {match.winnerId === 'human' ? '👤 ' : ''}{match.winnerName} won
            </span>
            <span className="text-xs text-gray-500">
              {match.judgeVotes.length} judge{match.judgeVotes.length !== 1 ? 's' : ''}
            </span>
          </button>

          {showReasoning && (
            <div className="px-6 py-4 bg-gray-900/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {match.judgeVotes.map((vote, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-300">
                      {vote.judgeName}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        vote.agreedWithConsensus
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {vote.agreedWithConsensus ? '✓ Agreed' : '✗ Disagreed'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed pl-4 border-l-2 border-gray-800">
                    {vote.reasoning}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
