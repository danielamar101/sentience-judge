import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BotCard from '@/components/BotCard';

describe('BotCard', () => {
  const defaultBot = {
    id: 'test-bot-id',
    name: 'Test Bot',
    eloRating: 1234,
    qualified: false,
    isJudge: false,
    credibilityScore: 100,
  };

  it('should render bot name', () => {
    render(<BotCard bot={defaultBot} />);
    expect(screen.getByText('Test Bot')).toBeInTheDocument();
  });

  it('should render ELO rating', () => {
    render(<BotCard bot={defaultBot} />);
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('should show "Not Qualified" badge for unqualified bot', () => {
    render(<BotCard bot={defaultBot} />);
    expect(screen.getByText('Not Qualified')).toBeInTheDocument();
  });

  it('should show "Qualified" badge for qualified bot', () => {
    render(<BotCard bot={{ ...defaultBot, qualified: true }} />);
    expect(screen.getByText('Qualified')).toBeInTheDocument();
  });

  it('should show "Judge" badge for judge bot', () => {
    render(<BotCard bot={{ ...defaultBot, isJudge: true }} />);
    expect(screen.getByText('Judge')).toBeInTheDocument();
  });

  it('should show credibility score for judge bot', () => {
    render(<BotCard bot={{ ...defaultBot, isJudge: true, credibilityScore: 85 }} />);
    expect(screen.getByText('Credibility')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should not show credibility for non-judge bot', () => {
    render(<BotCard bot={defaultBot} />);
    expect(screen.queryByText('Credibility')).not.toBeInTheDocument();
  });

  it('should link to bot detail page', () => {
    render(<BotCard bot={defaultBot} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard/bot/test-bot-id');
  });
});
