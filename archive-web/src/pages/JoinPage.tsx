import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import AppLayout from '@/components/AppLayout';

const JoinPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { setPendingJoinCode, setScreen, game } = useGame();

  useEffect(() => {
    if (code) {
      setPendingJoinCode(code.toUpperCase());
      setScreen('join');
    }
  }, [code, setPendingJoinCode, setScreen]);

  // Once user has joined and has a game, redirect to / (cleaner URL)
  useEffect(() => {
    if (game) {
      navigate('/', { replace: true });
    }
  }, [game, navigate]);

  return <AppLayout />;
};

export default JoinPage;
