'use client';

import Link from 'next/link';

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

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  type: 'bots' | 'judges';
}

export default function Leaderboard({ entries, type }: LeaderboardProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Name
            </th>
            {type === 'bots' ? (
              <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  ELO
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Matches
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </>
            ) : (
              <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Credibility
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  ELO
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-900/50 transition-colors">
              <td className="px-4 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    entry.rank === 1
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : entry.rank === 2
                      ? 'bg-gray-400/20 text-gray-300'
                      : entry.rank === 3
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {entry.rank}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <Link
                  href={`/arena/match/${entry.id}`}
                  className="text-gray-100 hover:text-indigo-400 transition-colors font-medium"
                >
                  {entry.name}
                </Link>
              </td>
              {type === 'bots' ? (
                <>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-indigo-400 font-bold">{entry.eloRating}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-400">
                    {entry.totalMatches || 0}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-400">
                    {entry.totalMatches
                      ? `${Math.round(((entry.wins || 0) / entry.totalMatches) * 100)}%`
                      : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {entry.isJudge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900 text-indigo-300">
                        Judge
                      </span>
                    )}
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-800 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${Math.min(100, entry.credibilityScore || 0)}%` }}
                        />
                      </div>
                      <span className="text-gray-300">{entry.credibilityScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-gray-400">{entry.eloRating}</span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No entries yet
        </div>
      )}
    </div>
  );
}
