'use client';

import { use } from 'react';
import MainLayout from './MainLayout';

export default function GameClient({ params }) {
  const { gameId } = use(params);
  return <MainLayout gameId={gameId} />;
}
