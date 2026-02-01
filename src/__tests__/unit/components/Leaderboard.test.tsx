import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Leaderboard from '@/components/Leaderboard';

describe('Leaderboard', () => {
  const botEntries = [
    { rank: 1, id: 'bot-1', name: 'Alpha', eloRating: 1500, isJudge: true, totalMatches: 50, wins: 35 },
    { rank: 2, id: 'bot-2', name: 'Beta', eloRating: 1400, isJudge: false, totalMatches: 30, wins: 18 },
    { rank: 3, id: 'bot-3', name: 'Gamma', eloRating: 1300, isJudge: true, totalMatches: 20, wins: 10 },
  ];

  const judgeEntries = [
    { rank: 1, id: 'judge-1', name: 'Alpha', eloRating: 1500, credibilityScore: 95 },
    { rank: 2, id: 'judge-2', name: 'Beta', eloRating: 1400, credibilityScore: 88 },
  ];

  describe('bots leaderboard', () => {
    it('should render all bot entries', () => {
      render(<Leaderboard entries={botEntries} type="bots" />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('should display rank numbers', () => {
      render(<Leaderboard entries={botEntries} type="bots" />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display ELO ratings', () => {
      render(<Leaderboard entries={botEntries} type="bots" />);

      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getByText('1400')).toBeInTheDocument();
      expect(screen.getByText('1300')).toBeInTheDocument();
    });

    it('should display match counts', () => {
      render(<Leaderboard entries={botEntries} type="bots" />);

      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should display win rates', () => {
      render(<Leaderboard entries={botEntries} type="bots" />);

      expect(screen.getByText('70%')).toBeInTheDocument(); // 35/50
      expect(screen.getByText('60%')).toBeInTheDocument(); // 18/30
      expect(screen.getByText('50%')).toBeInTheDocument(); // 10/20
    });

    it('should show Judge badge for judge bots', () => {
      render(<Leaderboard entries={botEntries} type="bots" />);

      const judgeBadges = screen.getAllByText('Judge');
      expect(judgeBadges).toHaveLength(2); // Alpha and Gamma are judges
    });

    it('should show empty state when no entries', () => {
      render(<Leaderboard entries={[]} type="bots" />);

      expect(screen.getByText('No entries yet')).toBeInTheDocument();
    });
  });

  describe('judges leaderboard', () => {
    it('should render all judge entries', () => {
      render(<Leaderboard entries={judgeEntries} type="judges" />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('should display credibility scores', () => {
      render(<Leaderboard entries={judgeEntries} type="judges" />);

      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('88')).toBeInTheDocument();
    });
  });
});
