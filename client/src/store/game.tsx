// Global game store: the current GameState, simple screen routing, the
// in-progress match, and the actions that talk to the backend.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  GameState,
  LiveMatch,
  MatchResult,
  NewCareerInput,
  TrainingFocus,
} from '@onze/shared';
import { api } from '../api/client';

export type Route = 'onboarding' | 'hub' | 'training' | 'match' | 'career' | 'inbox' | 'conversation';

const LS_KEY = 'onze.gameId';

interface GameContextValue {
  state: GameState | null;
  loading: boolean;
  booting: boolean;
  route: Route;
  activeCharacterId: string | null;
  liveMatch: LiveMatch | null;
  matchResult: MatchResult | null;
  chosenOption: string | null;
  toast: string | null;

  navigate: (route: Route) => void;
  openConversation: (characterId: string) => void;
  newCareer: (input: NewCareerInput) => Promise<void>;
  advanceWeek: () => Promise<void>;
  resolveDecision: (optionId: string) => Promise<void>;
  setTraining: (focus: TrainingFocus) => Promise<void>;
  applyState: (s: GameState) => void;
  showToast: (msg: string) => void;
  resetCareer: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }): JSX.Element {
  const [gameId, setGameId] = useState<string | null>(() => localStorage.getItem(LS_KEY));
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [route, setRoute] = useState<Route>('onboarding');
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [chosenOption, setChosenOption] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  // boot: resume an existing career if we have one
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (gameId) {
          const s = await api.get(gameId);
          if (!cancelled) {
            setState(s);
            setRoute('hub');
          }
        }
      } catch {
        localStorage.removeItem(LS_KEY);
        if (!cancelled) setGameId(null);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useCallback((r: Route) => setRoute(r), []);
  const applyState = useCallback((s: GameState) => setState(s), []);

  const openConversation = useCallback((characterId: string) => {
    setActiveCharacterId(characterId);
    setRoute('conversation');
  }, []);

  const newCareer = useCallback(async (input: NewCareerInput) => {
    setLoading(true);
    try {
      const s = await api.newCareer(input);
      localStorage.setItem(LS_KEY, s.id);
      setGameId(s.id);
      setState(s);
      setLiveMatch(null);
      setMatchResult(null);
      setRoute('hub');
    } finally {
      setLoading(false);
    }
  }, []);

  const advanceWeek = useCallback(async () => {
    if (!state) return;
    setLoading(true);
    try {
      const res = await api.advance(state.id);
      setState(res.state);
      if (res.liveMatch) {
        setLiveMatch(res.liveMatch);
        setMatchResult(null);
        setChosenOption(null);
        setRoute('match');
      } else {
        showToast(`Semaine ${res.state.week} — pas de match cette semaine.`);
      }
    } finally {
      setLoading(false);
    }
  }, [state, showToast]);

  const resolveDecision = useCallback(
    async (optionId: string) => {
      if (!state) return;
      setChosenOption(optionId);
      setLoading(true);
      try {
        const res = await api.resolveDecision(state.id, optionId);
        setState(res.state);
        setMatchResult(res.result);
      } finally {
        setLoading(false);
      }
    },
    [state],
  );

  const setTraining = useCallback(
    async (focus: TrainingFocus) => {
      if (!state) return;
      const s = await api.setTraining(state.id, focus);
      setState(s);
    },
    [state],
  );

  const resetCareer = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setGameId(null);
    setState(null);
    setLiveMatch(null);
    setMatchResult(null);
    setRoute('onboarding');
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      state, loading, booting, route, activeCharacterId, liveMatch, matchResult, chosenOption, toast,
      navigate, openConversation, newCareer, advanceWeek, resolveDecision, setTraining, applyState, showToast, resetCareer,
    }),
    [state, loading, booting, route, activeCharacterId, liveMatch, matchResult, chosenOption, toast,
      navigate, openConversation, newCareer, advanceWeek, resolveDecision, setTraining, applyState, showToast, resetCareer],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
