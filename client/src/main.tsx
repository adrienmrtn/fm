import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './store/game';
import { App } from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
