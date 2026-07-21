// Frame 1 — Accueil / le hub.
import {
  ATTR_LABELS,
  POSITION_LABELS,
  formatEuro,
  reputationLabel,
  type AttrKey,
  type GameState,
} from '@onze/shared';
import { useGame } from '../store/game';
import { Sidebar } from '../components/Sidebar';
import { Avatar, Bar, Icon, StatTile } from '../components/ui';

const HUB_ATTRS: AttrKey[] = ['vitesse', 'technique', 'finition', 'physique'];

export function Hub(): JSX.Element {
  const { state, advanceWeek, loading, openConversation } = useGame();
  if (!state) return <div />;
  const p = state.player;
  const formLabel = p.form >= 82 ? 'En feu' : p.form >= 64 ? 'Bonne' : 'Neutre';
  const next = nextMatch(state);

  return (
    <div className="frame">
      <Sidebar />
      <main className="app-main">
        <div className="topbar">
          <div>
            <div style={{ font: '400 12px Sora,sans-serif', color: '#5c625c', marginBottom: 2 }}>Semaine {state.week} · {state.season}</div>
            <div style={{ font: '700 22px Sora,sans-serif', color: '#eef1ea' }}>Salut, {p.firstName}.</div>
          </div>
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <div className="icon-btn">{Icon.bell({ size: 19, stroke: '#8a9187' })}{state.notifications.some((n) => n.unread) && <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#ff5a52', border: '2px solid #141715' }} />}</div>
            <button className="btn-lime" disabled={loading} onClick={advanceWeek}>Avancer la semaine {Icon.arrow({ size: 16 })}</button>
          </div>
        </div>

        <div className="scroll" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 336px', gap: 20, padding: '24px 28px', overflowY: 'auto' }}>
          {/* left column */}
          <div className="col" style={{ gap: 20, minWidth: 0 }}>
            {/* big player card */}
            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, background: 'radial-gradient(circle,rgba(201,255,60,0.10),transparent 70%)', pointerEvents: 'none' }} />
              <div className="row" style={{ gap: 20, position: 'relative' }}>
                <Avatar initials={`${p.firstName[0]}${p.lastName[0]}`} size={84} radius={18} fontSize={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                    <div style={{ font: '700 24px Sora,sans-serif', color: '#eef1ea' }}>{p.firstName} {p.lastName}</div>
                    <span className="tag tag--green">{formLabel}</span>
                  </div>
                  <div style={{ font: '500 13px Sora,sans-serif', color: '#8a9187', marginTop: 3 }}>{state.club.name} · {POSITION_LABELS[p.position]} · N°{p.squadNumber}</div>
                  <div className="row" style={{ gap: 26, marginTop: 16 }}>
                    <Metric label="Valeur marchande" value={formatEuro(p.marketValue)} lime />
                    <Metric label="Réputation" value={reputationLabel(p.reputation)} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <div className="between" style={{ marginBottom: 7 }}>
                  <span style={{ font: '500 11px Sora,sans-serif', color: '#8a9187' }}>Forme physique</span>
                  <span style={{ font: '600 11px Sora,sans-serif', color: '#c9ff3c' }}>{p.fitness}%</span>
                </div>
                <Bar value={p.fitness} large />
              </div>
              <div className="row" style={{ gap: 10, marginTop: 18 }}>
                {HUB_ATTRS.map((k) => (
                  <StatTile key={k} value={Math.round(p.attributes[k])} label={ATTR_LABELS[k]} />
                ))}
              </div>
            </div>

            {/* next match */}
            <div className="card card--sm" style={{ padding: 22 }}>
              <div className="between" style={{ marginBottom: 18 }}>
                <span className="eyebrow">Prochain match</span>
                <span className="tag" style={{ textTransform: 'none' }}>{state.league.name} · J{next?.week ?? state.week}</span>
              </div>
              {next ? (
                <>
                  <div className="row" style={{ alignItems: 'center', justifyContent: 'center', gap: 28 }}>
                    <TeamBadge tag={state.club.shortName} name={state.club.name} home />
                    <div style={{ textAlign: 'center' }}>
                      <div className="num" style={{ fontSize: 20, color: '#5c625c' }}>VS</div>
                      <div style={{ font: '500 10px Sora,sans-serif', color: '#5c625c', marginTop: 4 }}>{next.home ? 'Domicile' : 'Extérieur'}</div>
                    </div>
                    <TeamBadge tag={next.opp.shortName} name={next.opp.name} />
                  </div>
                  <div style={{ textAlign: 'center', font: '500 12px Sora,sans-serif', color: '#8a9187', marginTop: 16 }}>Journée {next.week} · {state.season}</div>
                </>
              ) : (
                <div style={{ font: '500 13px Sora,sans-serif', color: '#8a9187', textAlign: 'center', padding: '18px 0' }}>Saison terminée — belle carrière !</div>
              )}
            </div>

            {/* objectives */}
            <div className="card card--sm" style={{ padding: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>Objectifs & storylines</div>
              <div className="col" style={{ gap: 16 }}>
                {state.objectives.map((o) => (
                  <div key={o.id}>
                    <div className="between" style={{ marginBottom: 7 }}>
                      <span style={{ font: '500 13px Sora,sans-serif', color: '#eef1ea' }}>{o.label}</span>
                      <span style={{ font: '600 12px Sora,sans-serif', color: '#8a9187' }}>{o.kind === 'count' ? `${o.current} / ${o.target}` : `${o.progress}%`}</span>
                    </div>
                    <Bar value={o.kind === 'count' ? ((o.current ?? 0) / (o.target ?? 1)) * 100 : o.progress ?? 0} />
                  </div>
                ))}
                {state.offers.some((o) => o.status === 'open') && (
                  <div className="between" style={{ padding: '12px 14px', borderRadius: 11, background: 'rgba(255,90,82,0.06)', border: '1px solid rgba(255,90,82,0.18)' }}>
                    <span style={{ font: '500 13px Sora,sans-serif', color: '#eef1ea' }}>Une offre de transfert est sur la table.</span>
                    <span className="tag tag--red">DÉCISION</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* right column */}
          <div className="col" style={{ gap: 16 }}>
            <div className="card card--sm">
              <div className="between" style={{ marginBottom: 14 }}>
                <span className="eyebrow">Notifications</span>
                {state.notifications.filter((n) => n.unread).length > 0 && <span className="badge-pill">{state.notifications.filter((n) => n.unread).length}</span>}
              </div>
              <div className="col" style={{ gap: 4 }}>
                {state.notifications.slice(0, 4).map((n) => {
                  const ch = state.characters.find((c) => c.id === n.characterId);
                  return (
                    <button key={n.id} onClick={() => n.characterId && openConversation(n.characterId)} style={{ display: 'flex', gap: 12, padding: '11px 10px', borderRadius: 11, background: '#0f1211', position: 'relative', border: 'none', textAlign: 'left', cursor: n.characterId ? 'pointer' : 'default', width: '100%' }}>
                      <Avatar initials={ch?.initials ?? '•'} color={ch?.accentColor} size={36} radius={10} fontSize={13} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: '600 12.5px Sora,sans-serif', color: '#eef1ea' }}>{n.title}</div>
                        <div style={{ font: '400 11.5px/1.35 Sora,sans-serif', color: '#8a9187', marginTop: 1 }}>{n.text}</div>
                        <div style={{ font: '400 10px Sora,sans-serif', color: '#5c625c', marginTop: 4 }}>Semaine {n.week}</div>
                      </div>
                      {n.unread && <span style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#ff5a52' }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card--lime card card--sm" style={{ textAlign: 'center' }}>
              <div style={{ font: '600 14px Sora,sans-serif', color: '#eef1ea' }}>Prêt pour la semaine ?</div>
              <div style={{ font: '400 12px/1.4 Sora,sans-serif', color: '#8a9187', margin: '6px 0 16px' }}>
                {state.trainingFocus ? `Entraînement : ${state.trainingFocus}.` : 'Aucun entraînement choisi.'} {state.notifications.filter((n) => n.unread).length} message(s) en attente.
              </div>
              <button className="btn-lime btn-lime--block btn-lime--lg" disabled={loading} onClick={advanceWeek}>Avancer la semaine {Icon.arrow({ size: 16 })}</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function nextMatch(state: GameState) {
  const fx = state.upcomingFixtures[0];
  if (!fx) return null;
  const home = fx.homeClubId === state.player.clubId;
  const oppId = home ? fx.awayClubId : fx.homeClubId;
  const opp = state.clubs.find((c) => c.id === oppId);
  if (!opp) return null;
  return { week: fx.week, home, opp };
}

function Metric({ label, value, lime = false }: { label: string; value: string; lime?: boolean }): JSX.Element {
  return (
    <div>
      <div style={{ font: '500 10px Sora,sans-serif', color: '#5c625c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div className="num" style={{ fontSize: 26, color: lime ? '#c9ff3c' : '#eef1ea', lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
function TeamBadge({ tag, name, home = false }: { tag: string; name: string; home?: boolean }): JSX.Element {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, margin: '0 auto', borderRadius: 12, background: home ? 'linear-gradient(135deg,#2c322d,#151816)' : '#0f1211', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontWeight: 600, color: home ? '#c9ff3c' : '#8a9187', fontSize: 16 }}>{tag}</div>
      <div style={{ font: '600 12px Sora,sans-serif', color: '#eef1ea', marginTop: 8 }}>{name}</div>
    </div>
  );
}
