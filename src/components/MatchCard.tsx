'use client';

import Link from 'next/link';
import Card, { CardContent } from './ui/Card';

interface MatchCardProps {
  match: {
    id: string;
    opponentName: string;
    won: boolean;
    createdAt: string | Date;
  };
}

export default function MatchCard({ match }: MatchCardProps) {
  const date = new Date(match.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link href={`/arena/match/${match.id}`}>
      <Card variant="interactive">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  match.won ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <div>
                <span className="text-gray-400 text-sm">vs</span>{' '}
                <span className="text-gray-100 font-medium">{match.opponentName}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`text-sm font-medium ${
                  match.won ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {match.won ? 'Won' : 'Lost'}
              </span>
              <span className="text-xs text-gray-500">{formattedDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
