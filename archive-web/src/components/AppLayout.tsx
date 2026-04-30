import React from 'react';
import { useGame } from '@/contexts/GameContext';
import HomeScreen from '@/components/game/HomeScreen';
import CreateScreen from '@/components/game/CreateScreen';
import JoinScreen from '@/components/game/JoinScreen';
import LobbyScreen from '@/components/game/LobbyScreen';
import RoundSubmitScreen from '@/components/game/RoundSubmitScreen';
import RoundRevealScreen from '@/components/game/RoundRevealScreen';
import RoundResultScreen from '@/components/game/RoundResultScreen';
import GameEndScreen from '@/components/game/GameEndScreen';

const Router: React.FC = () => {
  const { screen, pendingJoinCode } = useGame();
  switch (screen) {
    case 'home':
      return <HomeScreen />;
    case 'create':
      return <CreateScreen />;
    case 'join':
      return <JoinScreen prefilledCode={pendingJoinCode || undefined} />;
    case 'lobby':
      return <LobbyScreen />;
    case 'round-submit':
      return <RoundSubmitScreen />;
    case 'round-reveal':
      return <RoundRevealScreen />;
    case 'round-result':
      return <RoundResultScreen />;
    case 'game-end':
      return <GameEndScreen />;
    default:
      return <HomeScreen />;
  }
};

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-100 antialiased">
      <Router />
    </div>
  );
};

export default AppLayout;
