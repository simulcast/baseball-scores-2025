import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameCard, { baseColor } from '../GameCard';

// --- baseColor helper tests ---

describe('baseColor', () => {
  it('returns --runner-on for occupied base', () => {
    expect(baseColor(true)).toBe('var(--runner-on)');
  });

  it('returns --runner-off for empty base', () => {
    expect(baseColor(false)).toBe('var(--runner-off)');
  });

  it('returns --runner-off for undefined (falsy)', () => {
    expect(baseColor(undefined)).toBe('var(--runner-off)');
  });
});

// --- BaseballDiamond render tests ---

// Minimal game fixture for rendering a live GameCard
const liveGame = {
  gamePk: 1,
  status: 'Live',
  gameDate: '2025-04-15T23:10:00Z',
  awayTeam: { name: 'Away', abbreviation: 'AWY' },
  homeTeam: { name: 'Home', abbreviation: 'HME' },
  awayScore: 0,
  homeScore: 0,
  inning: 1,
  isTopInning: true,
  inningState: 'Top',
  balls: 0,
  strikes: 0,
  outs: 0,
  runners: [false, false, false],
};

describe('BaseballDiamond (via GameCard)', () => {
  it('renders exactly 3 base elements for a live game', () => {
    render(<GameCard game={liveGame} />);
    expect(screen.getByTestId('base-1B')).toBeInTheDocument();
    expect(screen.getByTestId('base-2B')).toBeInTheDocument();
    expect(screen.getByTestId('base-3B')).toBeInTheDocument();
  });

  it('all bases show off-color when no runners', () => {
    render(<GameCard game={{ ...liveGame, runners: [false, false, false] }} />);
    expect(screen.getByTestId('base-1B')).toHaveStyle({ backgroundColor: 'var(--runner-off)' });
    expect(screen.getByTestId('base-2B')).toHaveStyle({ backgroundColor: 'var(--runner-off)' });
    expect(screen.getByTestId('base-3B')).toHaveStyle({ backgroundColor: 'var(--runner-off)' });
  });

  it('lights up 1st base when runner on first', () => {
    render(<GameCard game={{ ...liveGame, runners: [true, false, false] }} />);
    expect(screen.getByTestId('base-1B')).toHaveStyle({ backgroundColor: 'var(--runner-on)' });
    expect(screen.getByTestId('base-2B')).toHaveStyle({ backgroundColor: 'var(--runner-off)' });
    expect(screen.getByTestId('base-3B')).toHaveStyle({ backgroundColor: 'var(--runner-off)' });
  });

  it('lights up all bases when bases loaded', () => {
    render(<GameCard game={{ ...liveGame, runners: [true, true, true] }} />);
    expect(screen.getByTestId('base-1B')).toHaveStyle({ backgroundColor: 'var(--runner-on)' });
    expect(screen.getByTestId('base-2B')).toHaveStyle({ backgroundColor: 'var(--runner-on)' });
    expect(screen.getByTestId('base-3B')).toHaveStyle({ backgroundColor: 'var(--runner-on)' });
  });

  it('renders gracefully with empty runners array', () => {
    render(<GameCard game={{ ...liveGame, runners: [] }} />);
    expect(screen.getByTestId('base-1B')).toHaveStyle({ backgroundColor: 'var(--runner-off)' });
    expect(screen.getByTestId('base-2B')).toHaveStyle({ backgroundColor: 'var(--runner-off)' });
    expect(screen.getByTestId('base-3B')).toHaveStyle({ backgroundColor: 'var(--runner-off)' });
  });

  it('does not render diamond for non-live games', () => {
    const preGame = { ...liveGame, status: 'Preview' };
    render(<GameCard game={preGame} />);
    expect(screen.queryByTestId('base-1B')).not.toBeInTheDocument();
  });
});
