// Frame 5 — Carrière / profil.
import {
  ATTR_KEYS,
  ATTR_LABELS,
  POSITION_LABELS,
  formatEuro,
  reputationLabel,
} from '@onze/shared';
import { useGame } from '../store/game';
import { Sidebar } from '../components/Sidebar';
import { Avatar, AttrRow, Bar } from '../components/ui';

export function Career(): JSX.Element {
  const { state } = useGame();
  if (!state) return <div />;
  const p = state.player;
  const s = state.seasonStats;
  const sorted = [...ATTR_KEYS].sort((a, b) => p.attributes[b] - p.attributes[a]);
  const top2 = new Set(sorted.slice(0, 2));

  return (
    <div className="frame">
      <Sidebar />
      <main className="app-main">
        {/* header */}
        <div className="row" style={{ alignItems: 'center', gap: 20, padding: '24px 30px', borderBottom: '1px solid rgba(255,255,255,0.06)', flex: 'none' }}>
          <Avatar initials={`${p.firstName[0]}${p.lastName[0]}`} size={66} radius={16} fontSize={24} />
          <div style={{ flex: 1 }}>
            <div style={{ font: '700 24px Sora,sans-serif', color: '#eef1ea' }}>{p.firstName} {p.lastName}</div>
            <div style={{ font: '500 13px Sora,sans-serif', color: '#8a9187', marginTop: 2 }}>{POSITION_LABELS[p.position]} · {p.age} ans · {state.club.name}</div>
          </div>
          <HeaderMetric label="Valeur marchande" value={formatEuro(p.marketValue)} lime />
          <HeaderMetric label="Réputation" value={reputationLabel(p.reputation)} />
        </div>

        <div className="scroll" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.15fr 340px', gap: 22, padding: '24px 30px', overflowY: 'auto' }}>
          <div className="col" style={{ gap: 20, minWidth: 0 }}>
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 18 }}>Attributs</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
                {sorted.map((k) => <AttrRow key={k} name={ATTR_LABELS[k]} value={p.attributes[k]} highlight={top2.has(k)} />)}
              </div>
            </div>

            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 18 }}>Timeline de carrière</div>
              <TimelineItem active title={`${state.club.name} · ${state.league.name}`} tail={<span style={{ font: '500 11px Sora,sans-serif', color: '#c9ff3c' }}> · actuel</span>} sub={`Saison ${state.season} · ${s.matches} matchs · ${s.goals} buts · ${s.assists} passes D.`} line />
              <TimelineItem title="Centre de formation" sub="Révélation des jeunes, capitaine U19." line />
              <TimelineItem title="Débuts · foot amateur" sub={`Repéré à ${Math.max(14, p.age - 4)} ans en District.`} />
            </div>
          </div>

          <div className="col" style={{ gap: 16 }}>
            <div className="card card--sm">
              <div className="eyebrow" style={{ marginBottom: 14 }}>Valeur marchande</div>
              <Sparkline values={state.valueHistory} />
              <div className="between" style={{ marginTop: 8 }}>
                <span style={{ font: '500 11px Sora,sans-serif', color: '#5c625c' }}>{formatEuro(state.valueHistory[0] ?? p.marketValue)}</span>
                <span className="num" style={{ fontSize: 16, color: '#c9ff3c' }}>{formatEuro(p.marketValue)}</span>
              </div>
            </div>

            <div className="card card--sm">
              <div className="between" style={{ marginBottom: 9 }}><span style={{ font: '500 12px Sora,sans-serif', color: '#8a9187' }}>Réputation</span><span style={{ font: '600 12px Sora,sans-serif', color: '#eef1ea' }}>{reputationLabel(p.reputation)}</span></div>
              <div style={{ marginBottom: 16 }}><Bar value={p.reputation} large /></div>
              <div className="between" style={{ marginBottom: 9 }}><span style={{ font: '500 12px Sora,sans-serif', color: '#8a9187' }}>Forme physique</span><span style={{ font: '600 12px Sora,sans-serif', color: '#c9ff3c' }}>{p.fitness}%</span></div>
              <Bar value={p.fitness} large />
            </div>

            <div className="card card--sm">
              <div className="eyebrow" style={{ marginBottom: 14 }}>Bilan saison</div>
              <div className="row" style={{ gap: 10 }}>
                <Trophy value={s.motm} label="Homme du match" color="#f7b23f" />
                <Trophy value={s.goals} label="Buts" color="#c9ff3c" />
                <Trophy value={s.assists} label="Passes D." color="#8a9187" />
              </div>
            </div>

            <div className="card card--sm">
              <div className="between">
                <div>
                  <div style={{ font: '500 11px Sora,sans-serif', color: '#8a9187' }}>Statut du contrat</div>
                  <div style={{ font: '600 14px Sora,sans-serif', color: '#eef1ea', marginTop: 3 }}>{p.contract.monthsLeft} mois restants · {formatEuro(p.contract.wage)}/sem.</div>
                </div>
                <span className="tag tag--amber">{p.contract.monthsLeft <= 8 ? 'À négocier' : 'OK'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function HeaderMetric({ label, value, lime = false }: { label: string; value: string; lime?: boolean }): JSX.Element {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ font: '500 10px Sora,sans-serif', color: '#5c625c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div className="num" style={{ fontSize: 26, color: lime ? '#c9ff3c' : '#eef1ea', lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
function TimelineItem({ title, sub, tail, active = false, line = false }: { title: string; sub: string; tail?: React.ReactNode; active?: boolean; line?: boolean }): JSX.Element {
  return (
    <div className="row" style={{ gap: 16 }}>
      <div className="col" style={{ alignItems: 'center' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: active ? '#c9ff3c' : '#8a9187', boxShadow: active ? '0 0 10px rgba(201,255,60,0.6)' : 'none' }} />
        {line && <span style={{ flex: 1, width: 2, background: 'rgba(255,255,255,0.1)' }} />}
      </div>
      <div style={{ paddingBottom: line ? 20 : 0 }}>
        <div style={{ font: '600 14px Sora,sans-serif', color: '#eef1ea' }}>{title}{tail}</div>
        <div style={{ font: '400 12px Sora,sans-serif', color: '#8a9187', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}
function Trophy({ value, label, color }: { value: number; label: string; color: string }): JSX.Element {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '12px 6px', background: '#0f1211', borderRadius: 11 }}>
      <div className="num" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ font: '500 9px Sora,sans-serif', color: '#5c625c', marginTop: 3 }}>{label}</div>
    </div>
  );
}
function Sparkline({ values }: { values: number[] }): JSX.Element {
  const pts = values.length >= 2 ? values : [values[0] ?? 0, values[0] ?? 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const W = 260, H = 70;
  const coords = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - 6 - ((v - min) / range) * (H - 14);
    return `${x.toFixed(0)},${y.toFixed(0)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <polyline points={coords.join(' ')} fill="none" stroke="#c9ff3c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${coords.join(' ')} ${W},${H} 0,${H}`} fill="rgba(201,255,60,0.08)" stroke="none" />
    </svg>
  );
}
