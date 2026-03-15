import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainLayout from '../MainLayout';
import { useGameStore } from '../../store/gameStore';
import * as audio from '../../audio';

// --- Mocks ---

jest.mock('../../audio', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  ensureRunning: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(false),
  pause: jest.fn(),
  resume: jest.fn(),
  setMasterVolume: jest.fn(),
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('../../hooks/useGamePolling', () => ({
  useGamePolling: jest.fn(),
}));

jest.mock('../../hooks/useLiveGamePolling', () => ({
  useLiveGamePolling: jest.fn(),
}));

const liveGame = {
  gamePk: 1,
  gameId: '1',
  status: 'Live',
  gameDate: '2025-04-15T23:10:00Z',
  awayTeam: { id: 2, name: 'Red Sox', abbreviation: 'BOS' },
  homeTeam: { id: 1, name: 'Yankees', abbreviation: 'NYY' },
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

beforeEach(() => {
  jest.clearAllMocks();
  useGameStore.setState({
    games: { '1': liveGame },
    activeGameId: null,
    lastAcceptedSeq: 0,
    lastUpdatedAt: null,
    pollError: null,
  });
});

describe('MainLayout audio integration', () => {
  test('handleGameSelect calls audio.connect + ensureRunning on first tap', async () => {
    audio.isConnected.mockReturnValue(false);

    render(<MainLayout />);
    const card = screen.getByText('Red Sox').closest('.MuiCard-root');

    await act(async () => {
      fireEvent.click(card);
    });

    expect(audio.connect).toHaveBeenCalled();
    expect(audio.ensureRunning).toHaveBeenCalled();
  });

  test('handleGameSelect still selects game when audio.connect throws', async () => {
    audio.isConnected.mockReturnValue(false);
    audio.connect.mockRejectedValueOnce(new Error('AudioContext not allowed'));

    render(<MainLayout />);
    const card = screen.getByText('Red Sox').closest('.MuiCard-root');

    await act(async () => {
      fireEvent.click(card);
    });

    // Game should still be selected despite audio failure
    expect(useGameStore.getState().activeGameId).toBe('1');
  });

  test('handleGameSelect calls ensureRunning (not connect) on subsequent taps', async () => {
    audio.isConnected.mockReturnValue(true);

    render(<MainLayout />);
    const card = screen.getByText('Red Sox').closest('.MuiCard-root');

    await act(async () => {
      fireEvent.click(card);
    });

    expect(audio.connect).not.toHaveBeenCalled();
    expect(audio.ensureRunning).toHaveBeenCalled();
  });

  test('visibilitychange resumes audio when connected', async () => {
    jest.useFakeTimers();
    audio.isConnected.mockReturnValue(true);

    render(<MainLayout />);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Visibility handler waits 100ms before calling ensureRunning (iOS Safari workaround)
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(audio.ensureRunning).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('visibilitychange does nothing when not connected', async () => {
    jest.useFakeTimers();
    audio.isConnected.mockReturnValue(false);

    render(<MainLayout />);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(audio.ensureRunning).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
