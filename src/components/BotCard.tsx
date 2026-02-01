'use client';

import Link from 'next/link';
import Card, { CardContent } from './ui/Card';

interface BotCardProps {
  bot: {
    id: string;
    name: string;
    eloRating: number;
    qualified: boolean;
    isJudge: boolean;
    credibilityScore: number;
  };
}

export default function BotCard({ bot }: BotCardProps) {
  return (
    <Link href={`/dashboard/bot/${bot.id}`}>
      <Card variant="interactive">
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">{bot.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {bot.qualified ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                    Qualified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900 text-yellow-300">
                    Not Qualified
                  </span>
                )}
                {bot.isJudge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900 text-indigo-300">
                    Judge
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-400">{bot.eloRating}</div>
              <div className="text-xs text-gray-500">ELO</div>
            </div>
          </div>
          {bot.isJudge && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Credibility</span>
                <span className="text-gray-300">{bot.credibilityScore}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
