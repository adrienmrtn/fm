// Frame 3 — Entraînement. Pick the week's focus (progress vs fatigue/injury).
import {
  ATTR_KEYS,
  ATTR_LABELS,
  FOCUS_BLURB,
  type AttrKey,
  type TrainingFocus,
} from '@onze/shared';
import { useGame } from '../store/game';
import { Sidebar } from '../components/Sidebar';
import { AttrRow, Bar, Icon } from '../components/ui';

export function Training(): JSX.Element {
  const { state, setTraining, navigate, showToast } = useGame();
  if (!state) return <div />;
  const p = state.player;
  const focus = state.trainingFocus;

  const estGain = (k: AttrKey) => Math.max(1, Math.round((p.potential - p.attributes[k]) / 12));
  const injuryRisk = p.fitness >= 75 ? { label: 'Faible', variant: 'amber' as const } : p.fitness >= 50 ? { label: 'Moyen', variant: 'amber' as const } : { label: 'Élevé', variant: 'amber' as const };

  const choose = (f: TrainingFocus) => setTraining(f);
  const validate = () => {
    showToast(focus ? `Focus « ${focus} » validé pour la semaine.` : 'Semaine sans focus — repos léger.');
    navigate('hub');
  };

  return (
    <div className="frame">
      <Sidebar />
      <main className="app-main">
        <div style={{ padding: '26px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flex: 'none' }}>
          <div style={{ font: '400 12px Sora,sans-serif', color: '#5c625c', marginBottom: 3 }}>Semaine {state.week} · {state.season}</div>
          <div style={{ font: '700 24px Sora,sans-serif', color: '#eef1ea' }}>Focus de la semaine</div>
        </div>

        <div className="scroll" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, padding: '26px 32px', overflowY: 'auto' }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Sur quoi tu bosses ?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {ATTR_KEYS.map((k) => {
                const picked = focus === k;
                return (
                  <button key={k} onClick={() => choose(k)} className={`choice${picked ? ' is-picked' : ''}`} style={{ padding: 18, position: 'relative', textAlign: 'left' }}>
                    {picked && <span style={{ position: 'absolute', top: 14, right: 14, font: '700 9px Sora,sans-serif', color: '#0c0e0d', background: '#c9ff3c', padding: '2px 8px', borderRadius: 20 }}>CHOISI</span>}
                    <div style={{ font: '700 16px Sora,sans-serif', color: picked ? '#c9ff3c' : '#eef1ea' }}>{ATTR_LABELS[k]}</div>
                    <div style={{ font: '400 12px/1.4 Sora,sans-serif', color: picked ? '#a7b39a' : '#5c625c', marginTop: 5 }}>{FOCUS_BLURB[k]}</div>
                    <div className="num" style={{ fontSize: 15, color: picked ? '#56d970' : '#8a9187', marginTop: 12 }}>progrès estimé +{estGain(k)}</div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => choose('repos')} className={`choice${focus === 'repos' ? ' is-picked' : ''}`} style={{ marginTop: 14, borderStyle: focus === 'repos' ? 'solid' : 'dashed', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#0f1211', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{Icon.whistle({ size: 20, stroke: '#8a9187' })}</div>
              <div style={{ flex: 1 }}>
                <div style={{ font: '600 14px Sora,sans-serif', color: '#eef1ea' }}>Se reposer</div>
                <div style={{ font: '400 12px Sora,sans-serif', color: '#5c625c', marginTop: 2 }}>{FOCUS_BLURB.repos}</div>
              </div>
              <span className="num" style={{ fontSize: 15, color: '#56d970' }}>+15% forme</span>
            </button>
          </div>

          <div className="col" style={{ gap: 16 }}>
            <div className="card card--sm">
              <div className="eyebrow" style={{ marginBottom: 16 }}>Attributs actuels</div>
              <div className="col" style={{ gap: 13 }}>
                {ATTR_KEYS.map((k) => (
                  <AttrRow key={k} name={ATTR_LABELS[k]} value={p.attributes[k]} highlight={focus === k} />
                ))}
              </div>
            </div>

            <div className="card card--sm">
              <div className="between" style={{ marginBottom: 9 }}>
                <span style={{ font: '500 12px Sora,sans-serif', color: '#8a9187' }}>Forme physique</span>
                <span style={{ font: '600 12px Sora,sans-serif', color: '#c9ff3c' }}>{p.fitness}%</span>
              </div>
              <div style={{ marginBottom: 16 }}><Bar value={p.fitness} large /></div>
              <div className="between" style={{ padding: '11px 14px', borderRadius: 11, background: 'rgba(247,178,63,0.08)', border: '1px solid rgba(247,178,63,0.2)' }}>
                <span style={{ font: '500 12px Sora,sans-serif', color: '#f7b23f' }}>Risque de blessure</span>
                <span style={{ font: '700 12px Sora,sans-serif', color: '#f7b23f' }}>{injuryRisk.label}</span>
              </div>
            </div>

            <button className="btn-lime btn-lime--block btn-lime--lg" onClick={validate}>Valider la semaine {Icon.arrow({ size: 16 })}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
