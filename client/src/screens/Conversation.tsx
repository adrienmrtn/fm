// Frame 2 — Conversation (écran héro). Chat + context panel.
import { useEffect, useRef, useState } from 'react';
import {
  CHARACTER_LABELS,
  formatEuro,
  type Character,
  type Message,
} from '@onze/shared';
import { useGame } from '../store/game';
import { api } from '../api/client';
import { Sidebar } from '../components/Sidebar';
import { Avatar, Icon } from '../components/ui';

export function Conversation(): JSX.Element {
  const { state, activeCharacterId, applyState, navigate, showToast } = useGame();
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // load the thread
  useEffect(() => {
    if (!state || !activeCharacterId) return;
    api.thread(state.id, activeCharacterId).then((t) => {
      setCharacter(t.character);
      setMessages(t.messages);
      setSuggestions(t.suggestions);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.id, activeCharacterId]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (!state || !character) return <div />;

  const openOffer = state.offers.find((o) => o.status === 'open');
  const suitor = openOffer ? state.clubs.find((c) => c.id === openOffer.fromClubId) : null;

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    setInput('');
    const optimistic: Message = { id: `tmp-${Date.now()}`, role: 'player', text, week: state.week, ts: Date.now() };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const res = await api.sendMessage(state.id, character.id, text);
      // rebuild from server truth (adds char reply + any system line)
      const t = await api.thread(state.id, character.id);
      setMessages(t.messages);
      setSuggestions(res.suggestions);
      applyState(res.state);
      // refresh character (relationship may have changed)
      setCharacter(t.character);
      if (res.effect?.ok) showToast(res.effect.summary);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="frame">
      <Sidebar />
      <main className="app-main" style={{ flexDirection: 'row' }}>
        {/* chat column */}
        <div className="col" style={{ flex: 1, minWidth: 0, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          {/* header */}
          <div className="row" style={{ alignItems: 'center', gap: 14, padding: '18px 26px', borderBottom: '1px solid rgba(255,255,255,0.06)', flex: 'none' }}>
            <button className="btn-ghost" onClick={() => navigate('inbox')} style={{ padding: 4 }}>←</button>
            <div style={{ position: 'relative', flex: 'none' }}>
              <Avatar initials={character.initials} color={character.accentColor} size={46} radius={14} fontSize={17} />
              <span style={{ position: 'absolute', bottom: -2, right: -2, width: 13, height: 13, borderRadius: '50%', background: '#56d970', border: '2.5px solid #0c0e0d' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="row" style={{ alignItems: 'center', gap: 9 }}>
                <span style={{ font: '700 16px Sora,sans-serif', color: '#eef1ea' }}>{character.name}</span>
                <span className="tag tag--purple">{CHARACTER_LABELS[character.type]}</span>
              </div>
              <div style={{ font: '500 12px Sora,sans-serif', color: '#56d970', marginTop: 2 }}>En ligne · répond vite</div>
            </div>
            {openOffer && character.type === 'agent' && <span className="tag tag--amber">Négociation</span>}
          </div>

          {/* messages */}
          <div ref={feedRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '26px 26px 8px' }}>
            <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((m) => <Bubble key={m.id} m={m} character={character} />)}
              {sending && (
                <div className="row" style={{ gap: 10, alignItems: 'center', paddingLeft: 40 }}>
                  <div className="row" style={{ gap: 4, padding: '11px 14px', background: '#1a1e1b', borderRadius: 14 }}>
                    <Dot /><Dot /><Dot />
                  </div>
                  <span style={{ font: '400 11px Sora,sans-serif', color: '#5c625c' }}>{character.name.split(' ')[0]} écrit…</span>
                </div>
              )}
            </div>
          </div>

          {/* suggestions + input */}
          <div style={{ padding: '14px 26px 22px', flex: 'none' }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <div style={{ font: '500 10px Sora,sans-serif', letterSpacing: '0.5px', color: '#5c625c', textTransform: 'uppercase', marginBottom: 9 }}>Réponses suggérées</div>
              <div className="row" style={{ gap: 9, marginBottom: 14 }}>
                {suggestions.map((s) => (
                  <button key={s} disabled={sending} onClick={() => send(s)} style={{ flex: 1, padding: '11px 13px', borderRadius: 12, background: '#141715', border: '1px solid rgba(255,255,255,0.1)', font: '500 12.5px/1.35 Sora,sans-serif', color: '#eef1ea', cursor: 'pointer', textAlign: 'left' }}>{s}</button>
                ))}
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'center', background: '#141715', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '6px 6px 6px 16px' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
                  placeholder={`Écris ta réponse à ${character.name.split(' ')[0]}…`}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#eef1ea', font: '400 14px Sora,sans-serif', padding: '8px 0' }}
                />
                <button onClick={() => send(input)} disabled={sending || !input.trim()} style={{ width: 42, height: 42, border: 'none', borderRadius: 11, background: '#c9ff3c', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none', opacity: sending || !input.trim() ? 0.5 : 1 }}>
                  {Icon.send({ size: 19, stroke: '#0c0e0d' })}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* context panel */}
        <div className="scroll" style={{ width: 318, flex: 'none', overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="eyebrow">Contexte</div>
          {openOffer && suitor && (
            <div className="card--lime card card--sm">
              <div className="between" style={{ marginBottom: 14 }}>
                <span style={{ font: '600 12px Sora,sans-serif', color: '#c9ff3c' }}>Offre en cours · {suitor.name}</span>
                <span className="tag tag--lime" style={{ fontSize: 9 }}>{state.league.name}</span>
              </div>
              <ContextRow label="Salaire" value={`${formatEuro(openOffer.wage)}`} unit="/ sem." />
              <ContextRow label="Durée" value={`${openOffer.lengthYears} ans`} />
              <ContextRow label="Prime à la signature" value={formatEuro(openOffer.signingBonus)} />
            </div>
          )}
          <div className="card card--sm">
            <div style={{ font: '600 12px Sora,sans-serif', color: '#eef1ea', marginBottom: 12 }}>Contrat actuel · {state.club.name}</div>
            <div className="between" style={{ marginBottom: 10, alignItems: 'baseline' }}>
              <span style={{ font: '500 12px Sora,sans-serif', color: '#8a9187' }}>Mois restants</span>
              <span className="num" style={{ fontSize: 20, color: '#f7b23f' }}>{state.player.contract.monthsLeft}</span>
            </div>
            <div className="bar"><div className="bar__fill bar__fill--amber" style={{ width: `${Math.min(100, (state.player.contract.monthsLeft / 24) * 100)}%` }} /></div>
          </div>
          <div className="card card--sm">
            <div style={{ font: '500 11px Sora,sans-serif', color: '#8a9187', marginBottom: 4 }}>Ta valeur marchande</div>
            <div className="num" style={{ fontSize: 32, color: '#c9ff3c' }}>{formatEuro(state.player.marketValue)}</div>
          </div>
          <div className="card card--sm">
            <div className="between" style={{ marginBottom: 9 }}>
              <span style={{ font: '500 12px Sora,sans-serif', color: '#8a9187' }}>Relation avec {character.name.split(' ')[0]}</span>
              <span style={{ font: '600 12px Sora,sans-serif', color: '#56d970' }}>{relationLabel(character.relationship)}</span>
            </div>
            <div className="bar bar--lg"><div className="bar__fill bar__fill--green" style={{ width: `${character.relationship}%` }} /></div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Bubble({ m, character }: { m: Message; character: Character }): JSX.Element {
  if (m.role === 'system') {
    return <div style={{ textAlign: 'center', font: '500 11px Sora,sans-serif', color: '#c9ff3c', background: 'rgba(201,255,60,0.06)', border: '1px solid rgba(201,255,60,0.14)', borderRadius: 10, padding: '8px 12px', maxWidth: 420, margin: '0 auto' }}>✓ {m.text}</div>;
  }
  if (m.role === 'player') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '78%' }}>
        <div style={{ background: 'rgba(201,255,60,0.12)', border: '1px solid rgba(201,255,60,0.18)', borderRadius: '16px 4px 16px 16px', padding: '12px 15px', font: '400 14px/1.5 Sora,sans-serif', color: '#eef1ea' }}>{m.text}</div>
      </div>
    );
  }
  return (
    <div className="row" style={{ gap: 10, maxWidth: '78%' }}>
      <Avatar initials={character.initials} color={character.accentColor} size={30} radius={9} fontSize={11} />
      <div style={{ background: '#1a1e1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px 16px 16px 16px', padding: '12px 15px', font: '400 14px/1.5 Sora,sans-serif', color: '#eef1ea' }}>{m.text}</div>
    </div>
  );
}
function ContextRow({ label, value, unit }: { label: string; value: string; unit?: string }): JSX.Element {
  return (
    <div className="between" style={{ alignItems: 'baseline', marginBottom: 11 }}>
      <span style={{ font: '500 12px Sora,sans-serif', color: '#8a9187' }}>{label}</span>
      <span className="num" style={{ fontSize: 18, color: '#eef1ea' }}>{value}{unit && <span style={{ fontSize: 11, color: '#8a9187' }}> {unit}</span>}</span>
    </div>
  );
}
function Dot(): JSX.Element {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8a9187', animation: 'onze-in 0.6s infinite alternate' }} />;
}
function relationLabel(v: number): string {
  if (v >= 75) return 'Confiance';
  if (v >= 55) return 'Bonne';
  if (v >= 35) return 'Neutre';
  return 'Tendue';
}
