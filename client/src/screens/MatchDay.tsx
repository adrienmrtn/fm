// Frame 4 — Jour de match. Commentary feed + micro-decision + final rating.
import { formatEuro, formatRating, type MatchEvent } from '@onze/shared';
import { useGame } from '../store/game';
import { Sidebar } from '../components/Sidebar';
import { Icon } from '../components/ui';

export function MatchDay(): JSX.Element {
  const { state, liveMatch, matchResult, resolveDecision, loading, navigate } = useGame();
  if (!state || !liveMatch) return <div />;

  const opp = state.clubs.find((c) => c.id === liveMatch.opponentClubId);
  const decisionMinute = liveMatch.clockAtDecision;
  const resolved = !!matchResult;

  // score + clock depend on phase
  const homeScore = resolved ? matchResult!.homeGoals : liveMatch.playerHome ? liveMatch.scoreAtDecision[0] : liveMatch.scoreAtDecision[1];
  const awayScore = resolved ? matchResult!.awayGoals : liveMatch.playerHome ? liveMatch.scoreAtDecision[1] : liveMatch.scoreAtDecision[0];
  const clock = resolved ? 'FT' : `${decisionMinute}'`;

  const homeName = liveMatch.playerHome ? state.club.name : opp?.name ?? '—';
  const awayName = liveMatch.playerHome ? opp?.name ?? '—' : state.club.name;

  const afterEvents: MatchEvent[] = resolved ? matchResult!.perf.events.filter((e) => e.minute >= decisionMinute) : [];

  return (
    <div className="frame frame--pitch">
      <Sidebar />
      <main className="app-main" style={{ flexDirection: 'row' }}>
        <div className="col" style={{ flex: 1, minWidth: 0 }}>
          {/* scoreboard */}
          <div className="row" style={{ alignItems: 'center', justifyContent: 'center', gap: 30, padding: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', flex: 'none', background: 'rgba(0,0,0,0.25)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: '600 13px Sora,sans-serif', color: '#eef1ea' }}>{homeName}</div>
              <div style={{ font: '500 10px Sora,sans-serif', color: liveMatch.playerHome ? '#c9ff3c' : '#8a9187' }}>{liveMatch.playerHome ? 'Domicile' : 'Extérieur'}</div>
            </div>
            <div className="row" style={{ alignItems: 'center', gap: 14 }}>
              <span className="num" style={{ fontSize: 44, fontWeight: 700, color: '#eef1ea' }}>{homeScore}</span>
              <span className="num" style={{ fontSize: 24, color: '#5c625c' }}>–</span>
              <span className="num" style={{ fontSize: 44, fontWeight: 700, color: '#eef1ea' }}>{awayScore}</span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ font: '600 13px Sora,sans-serif', color: '#eef1ea' }}>{awayName}</div>
              <div style={{ font: '500 10px Sora,sans-serif', color: '#8a9187' }}>{liveMatch.playerHome ? 'Extérieur' : 'Domicile'}</div>
            </div>
            <div style={{ marginLeft: 12, padding: '6px 12px', borderRadius: 10, background: 'rgba(201,255,60,0.12)', border: '1px solid rgba(201,255,60,0.25)' }}>
              <span className="num" style={{ fontSize: 18, color: '#c9ff3c' }}>{clock}</span>
            </div>
          </div>

          {/* commentary */}
          <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '26px 34px' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {liveMatch.commentaryBeforeDecision.map((e, i) => <CommentaryLine key={`b${i}`} e={e} />)}

              {!resolved && liveMatch.decision && (
                <div style={{ borderRadius: 18, background: 'linear-gradient(160deg,#1c2410,#141715)', border: '1.5px solid #c9ff3c', padding: 22, boxShadow: '0 0 40px rgba(201,255,60,0.12)' }}>
                  <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c9ff3c', boxShadow: '0 0 10px #c9ff3c' }} />
                    <span style={{ font: '700 10px Sora,sans-serif', letterSpacing: '1.5px', color: '#c9ff3c', textTransform: 'uppercase' }}>Ton moment · {liveMatch.decision.minute}'</span>
                  </div>
                  <div style={{ font: '700 19px/1.35 Sora,sans-serif', color: '#eef1ea', marginBottom: 18 }}>{liveMatch.decision.prompt}</div>
                  <div className="row" style={{ gap: 12 }}>
                    {liveMatch.decision.options.map((o, i) => (
                      <button key={o.id} disabled={loading} onClick={() => resolveDecision(o.id)} style={{ flex: 1, padding: 15, borderRadius: 13, textAlign: 'left', cursor: 'pointer', background: i === 0 ? 'rgba(201,255,60,0.1)' : '#0f1211', border: i === 0 ? '1px solid rgba(201,255,60,0.3)' : '1px solid rgba(255,255,255,0.12)' }}>
                        <div style={{ font: '700 14px Sora,sans-serif', color: i === 0 ? '#c9ff3c' : '#eef1ea' }}>{o.label}</div>
                        <div style={{ font: '400 11.5px Sora,sans-serif', color: i === 0 ? '#a7b39a' : '#8a9187', marginTop: 4 }}>{o.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {resolved && afterEvents.map((e, i) => <CommentaryLine key={`a${i}`} e={e} />)}
            </div>
          </div>
        </div>

        {/* right panel */}
        <div className="scroll" style={{ width: 320, flex: 'none', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="eyebrow">Ton match · {resolved ? 'terminé' : 'en direct'}</div>
          <div className="card card--sm">
            <div className="between" style={{ marginBottom: 14 }}>
              <span style={{ font: '500 12px Sora,sans-serif', color: '#8a9187' }}>{resolved ? 'Note finale' : 'Note provisoire'}</span>
              <span className="num" style={{ fontSize: 26, fontWeight: 700, color: '#c9ff3c' }}>{resolved ? formatRating(matchResult!.perf.rating) : '—'}</span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <MiniStat value={resolved ? matchResult!.perf.touches : '—'} label="Touches" />
              <MiniStat value={resolved ? matchResult!.perf.shots : '—'} label="Tirs" />
              <MiniStat value={resolved ? matchResult!.perf.dribbles : '—'} label="Dribbles" />
            </div>
          </div>

          {resolved ? (
            <>
              <div className="eyebrow" style={{ marginTop: 6 }}>Coup de sifflet final</div>
              <div className="card--lime card card--sm" style={{ textAlign: 'center' }}>
                <div style={{ font: '500 11px Sora,sans-serif', color: '#8a9187', textTransform: 'uppercase', letterSpacing: '1px' }}>Ta note du match</div>
                <div className="num" style={{ fontSize: 56, fontWeight: 700, color: '#c9ff3c', margin: '6px 0' }}>{formatRating(matchResult!.perf.rating)}</div>
                <div style={{ font: '600 12px Sora,sans-serif', color: '#eef1ea' }}>{matchResult!.perf.manOfMatch ? 'Homme du match' : 'Feuille de match'}</div>
                <div className="row" style={{ justifyContent: 'center', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <FinalStat value={matchResult!.perf.goals} label="Buts" />
                  <FinalStat value={matchResult!.perf.assists} label="Passes D." />
                  <FinalStat value={`${matchResult!.perf.valueDelta >= 0 ? '+' : ''}${formatEuro(matchResult!.perf.valueDelta)}`} label="Valeur" lime />
                </div>
              </div>
              <button className="btn-lime btn-lime--block btn-lime--lg" onClick={() => navigate('hub')}>Continuer {Icon.arrow({ size: 16 })}</button>
            </>
          ) : (
            <div style={{ font: '400 12px/1.5 Sora,sans-serif', color: '#5c625c', padding: '4px 2px' }}>
              Le match se joue de tes crampons. Fais ton choix sur « ton moment » pour décider de l’issue.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CommentaryLine({ e }: { e: MatchEvent }): JSX.Element {
  const highlight = e.type === 'goal_for' || e.type === 'assist';
  const dim = e.type === 'note' && e.minute !== 90;
  return (
    <div className="row" style={{ gap: 14, opacity: dim ? 0.75 : 1 }}>
      <span className="num" style={{ fontSize: 13, color: '#5c625c', width: 32, flex: 'none', paddingTop: 2 }}>{e.minute}'</span>
      <span style={{ font: '400 14px/1.55 Sora,sans-serif', color: highlight ? '#c9ff3c' : e.minute === 90 ? '#eef1ea' : '#8a9187' }}>{e.text}</span>
    </div>
  );
}
function MiniStat({ value, label }: { value: React.ReactNode; label: string }): JSX.Element {
  return (
    <div style={{ flex: 1, background: '#0f1211', borderRadius: 10, padding: 10, textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 20, color: '#eef1ea' }}>{value}</div>
      <div style={{ font: '500 9px Sora,sans-serif', color: '#5c625c', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );
}
function FinalStat({ value, label, lime = false }: { value: React.ReactNode; label: string; lime?: boolean }): JSX.Element {
  return (
    <div>
      <div className="num" style={{ fontSize: 20, color: lime ? '#c9ff3c' : '#eef1ea' }}>{value}</div>
      <div style={{ font: '500 9px Sora,sans-serif', color: '#5c625c', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
