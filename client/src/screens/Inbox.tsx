// Frame 6 — Messagerie & News. Inbox (left) + world news feed (right).
import { useEffect, useMemo, useState } from 'react';
import { CHARACTER_LABELS, type CharacterType, type NewsItem } from '@onze/shared';
import { useGame } from '../store/game';
import { api, type ThreadSummary } from '../api/client';
import { Sidebar } from '../components/Sidebar';
import { Avatar } from '../components/ui';

const FILTERS: { key: 'all' | CharacterType; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'agent', label: 'Agent' },
  { key: 'coach', label: 'Coach' },
  { key: 'coequipier', label: 'Vestiaire' },
  { key: 'journaliste', label: 'Presse' },
];

export function Inbox(): JSX.Element {
  const { state, openConversation } = useGame();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [filter, setFilter] = useState<'all' | CharacterType>('all');

  useEffect(() => {
    if (state) api.threads(state.id).then(setThreads).catch(() => setThreads([]));
  }, [state?.id, state?.week]);

  const shown = useMemo(
    () => threads.filter((t) => filter === 'all' || t.character.type === filter),
    [threads, filter],
  );
  if (!state) return <div />;

  return (
    <div className="frame">
      <Sidebar />
      <main className="app-main" style={{ flexDirection: 'row' }}>
        {/* inbox */}
        <div className="col" style={{ width: '52%', borderRight: '1px solid rgba(255,255,255,0.06)', minWidth: 0 }}>
          <div style={{ padding: '22px 26px 16px', flex: 'none' }}>
            <div style={{ font: '700 20px Sora,sans-serif', color: '#eef1ea', marginBottom: 16 }}>Boîte de réception</div>
            <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={chipStyle(filter === f.key)}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
            {shown.map((t) => {
              const unread = state.notifications.some((n) => n.characterId === t.character.id && n.unread);
              return (
                <button key={t.character.id} onClick={() => openConversation(t.character.id)} style={{ display: 'flex', gap: 13, padding: '14px 12px', borderRadius: 13, background: unread ? 'rgba(201,255,60,0.06)' : 'transparent', border: unread ? '1px solid rgba(201,255,60,0.18)' : '1px solid transparent', marginBottom: 6, cursor: 'pointer', width: '100%', textAlign: 'left', position: 'relative' }}>
                  <Avatar initials={t.character.initials} color={t.character.accentColor} size={42} radius={12} fontSize={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="between">
                      <span style={{ font: '600 13.5px Sora,sans-serif', color: '#eef1ea' }}>{t.character.name}</span>
                      <span style={{ font: '400 10px Sora,sans-serif', color: '#5c625c' }}>{CHARACTER_LABELS[t.character.type]}</span>
                    </div>
                    <div style={{ font: '400 12px/1.35 Sora,sans-serif', color: '#8a9187', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.lastMessage ?? 'Démarre la conversation…'}
                    </div>
                  </div>
                  {unread && <span style={{ position: 'absolute', top: 16, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#ff5a52' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* world news */}
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', minWidth: 0 }}>
          <div style={{ font: '700 20px Sora,sans-serif', color: '#eef1ea', marginBottom: 16 }}>Le monde du foot</div>
          <div className="col" style={{ gap: 12 }}>
            {state.news.map((n) => <NewsCard key={n.id} n={n} />)}
          </div>
        </div>
      </main>
    </div>
  );
}

function NewsCard({ n }: { n: NewsItem }): JSX.Element {
  const toneBg = n.tone === 'bad' ? 'linear-gradient(160deg,#241a1a,#141715)' : n.category.includes('TOI') ? 'linear-gradient(160deg,#241a1a,#141715)' : '#141715';
  const tagCls = n.category === 'TON CLUB' ? 'tag--green' : n.category.includes('TOI') ? 'tag--red' : '';
  return (
    <div style={{ background: toneBg, border: n.category.includes('TOI') ? '1px solid rgba(255,90,82,0.2)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 16 }}>
      <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className={`tag ${tagCls}`} style={{ fontSize: 9 }}>{n.category}</span>
        <span style={{ font: '400 10px Sora,sans-serif', color: '#5c625c' }}>{n.subtitle}</span>
      </div>
      <div style={{ font: '600 14px/1.4 Sora,sans-serif', color: '#eef1ea' }}>{n.text}</div>
    </div>
  );
}
function chipStyle(active: boolean): React.CSSProperties {
  return { padding: '6px 13px', borderRadius: 20, background: active ? '#c9ff3c' : '#141715', border: active ? 'none' : '1px solid rgba(255,255,255,0.08)', color: active ? '#0c0e0d' : '#8a9187', font: `${active ? 600 : 500} 12px Sora,sans-serif`, cursor: 'pointer' };
}
