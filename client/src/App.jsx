import { useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import GameScreen from './components/GameScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import DuelScreen from './components/DuelScreen.jsx';
import { useLocalBestScore } from './hooks/useLocalBestScore.js';

// Simple state-driven router. No react-router needed for 5 screens.
export default function App() {
  const [screen, setScreen] = useState('landing');
  const [lastScore, setLastScore] = useState(0);
  const [highlightId, setHighlightId] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const { best, nickname, recordScore, recordNickname } = useLocalBestScore();

  function handleFinish(score) {
    setLastScore(score);
    recordScore(score);
    setScreen('result');
  }

  function go(to) {
    setScreen(to);
  }

  return (
    <>
      {screen === 'landing' && (
        <LandingPage
          onStart={() => go('game')}
          onLeaderboard={() => {
            setHighlightId(null);
            go('leaderboard');
          }}
          onHowItWorks={() => go('how')}
          onLogin={() => {
            setAuthMode('login');
            go('auth');
          }}
          onRegister={() => {
            setAuthMode('register');
            go('auth');
          }}
          onDuel={() => go('duel')}
        />
      )}
      {screen === 'auth' && (
        <AuthScreen
          initialMode={authMode}
          onBack={() => go('landing')}
          onSuccess={() => go('landing')}
        />
      )}
      {screen === 'duel' && (
        <DuelScreen
          onBack={() => go('landing')}
          onLogin={() => {
            setAuthMode('login');
            go('auth');
          }}
        />
      )}
      {screen === 'game' && (
        <GameScreen onFinish={handleFinish} onBack={() => go('landing')} />
      )}
      {screen === 'result' && (
        <ResultScreen
          score={lastScore}
          bestScore={best}
          defaultNickname={nickname}
          onPlayAgain={() => go('game')}
          onLeaderboard={() => go('leaderboard')}
          onSubmitted={(id) => setHighlightId(id)}
          onSaveNickname={(n) => recordNickname(n)}
        />
      )}
      {screen === 'leaderboard' && (
        <Leaderboard onBack={() => go('landing')} highlightId={highlightId} />
      )}
      {screen === 'how' && <HowItWorks onBack={() => go('landing')} />}
    </>
  );
}
