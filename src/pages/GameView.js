import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * GameView component - Redirects to the main layout with game ID
 */
const GameView = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(`/${gameId}`, { replace: true });
  }, [navigate, gameId]);
  
  return null;
};

export default GameView;