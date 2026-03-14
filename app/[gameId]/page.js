'use client';

import { use } from 'react';
import MainLayout from '../../src/components/MainLayout';

export default function GamePage({ params }) {
  const { gameId } = use(params);
  return <MainLayout gameId={gameId} />;
}
