// Frame 0 — Création du joueur. Full-screen onboarding.
import { useState } from 'react';
import {
  PHYSIQUE_LABELS,
  POSITION_SHORT,
  TIER_BLURB,
  TIER_LABELS,
  type ClubTier,
  type Physique,
  type Position,
} from '@onze/shared';
import { useGame } from '../store/game';
import { Icon } from '../components/ui';

const POSITIONS: Position[] = ['GB', 'DEF', 'MIL', 'AIL', 'ATT'];
const PHYSIQUES: Physique[] = ['leger', 'equilibre', 'puissant'];
const TIERS: ClubTier[] = ['national', 'ligue2', 'ligue1'];

// A light preview of starting stats per position (flavour only; the engine
// sets the real numbers on creation).
const PREVIEW: Record<Position, [string, number][]> = {
  GB: [['Réflexes', 74], ['Jeu au pied', 60], ['Mental', 72]],
  DEF: [['Vitesse', 70], ['Physique', 78], ['Mental', 71]],
  MIL: [['Passe', 78], ['Technique', 76], ['Vitesse', 72]],
  AIL: [['Vitesse', 84], ['Technique', 79], ['Finition', 71]],
  ATT: [['Finition', 80], ['Vitesse', 79], ['Technique', 74]],
};

export function Onboarding(): JSX.Element {
  const { newCareer, loading } = useGame();
  const [firstName, setFirstName] = useState('Lucas');
  const [lastName, setLastName] = useState('Moreau');
  const [age, setAge] = useState(19);
  const [position, setPosition] = useState<Position>('AIL');
  const [physique, setPhysique] = useState<Physique>('equilibre');
  const [tier, setTier] = useState<ClubTier>('ligue2');

  const canStart = firstName.trim() && lastName.trim() && !loading;

  const inputStyle = { background: '#141715', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 11, padding: '12px 14px', font: '500 15px Sora,sans-serif', color: '#eef1ea', outline: 'none', width: '100%' } as const;

  return (
    <div className="frame">
      {/* hero */}
      <div style={{ width: '44%', position: 'relative', background: 'linear-gradient(175deg,#12160f,#0a0c0b 70%)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: 44, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -140, right: -90, width: 420, height: 420, background: 'radial-gradient(circle,rgba(201,255,60,0.20),transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <span className="brand-dot" />
            <span className="brand-word" style={{ fontSize: 22 }}>ONZE</span>
          </div>
          <div style={{ font: '600 11px Sora,sans-serif', letterSpacing: '2.5px', color: '#c9ff3c', textTransform: 'uppercase', marginTop: 46 }}>Nouvelle carrière</div>
          <h2 style={{ font: '700 46px/1.02 Sora,sans-serif', color: '#eef1ea', margin: '14px 0 0', letterSpacing: '-1.5px' }}>Écris ta<br />légende.</h2>
          <p style={{ font: '400 15px/1.6 Sora,sans-serif', color: '#8a9187', maxWidth: 330, margin: '18px 0 0' }}>Un joueur. Une carrière. Chaque choix compte — du vestiaire aux projecteurs.</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, background: 'rgba(20,23,21,0.7)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 88, height: 104, borderRadius: 12, flex: 'none', background: 'repeating-linear-gradient(135deg,#1c211d,#1c211d 7px,#161a17 7px,#161a17 14px)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8 }}>
            <span style={{ font: "600 8px 'Courier New',monospace", color: '#5c625c', letterSpacing: '0.5px', textAlign: 'center' }}>PORTRAIT<br />JOUEUR</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: '700 20px Sora,sans-serif', color: '#eef1ea' }}>{firstName || 'Prénom'} {lastName || 'Nom'}</div>
            <div style={{ font: '500 12px Sora,sans-serif', color: '#8a9187', marginTop: 2 }}>{POSITION_SHORT[position]} · {age} ans</div>
            <div className="row" style={{ gap: 14, marginTop: 14 }}>
              {PREVIEW[position].map(([label, val], i) => (
                <div key={label}>
                  <div className="num" style={{ fontSize: 22, color: i === 0 ? '#c9ff3c' : '#eef1ea' }}>{val}</div>
                  <div style={{ font: '500 9px Sora,sans-serif', color: '#5c625c', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* form */}
      <div className="scroll" style={{ flex: 1, padding: '40px 46px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div className="between">
          <div className="row" style={{ gap: 7, alignItems: 'center' }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ width: 26, height: 5, borderRadius: 3, background: i < 4 ? '#c9ff3c' : 'rgba(255,255,255,0.12)' }} />
            ))}
          </div>
          <span style={{ font: '500 12px Sora,sans-serif', color: '#5c625c' }}>Nouvelle carrière</span>
        </div>

        <Section title="Identité">
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Label>Prénom</Label>
              <input style={inputStyle} value={firstName} maxLength={20} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Nom</Label>
              <input style={inputStyle} value={lastName} maxLength={20} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title="Poste">
          <div className="row" style={{ gap: 8 }}>
            {POSITIONS.map((pos) => (
              <button key={pos} onClick={() => setPosition(pos)} style={posStyle(pos === position)}>{POSITION_SHORT[pos]}</button>
            ))}
          </div>
        </Section>

        <Section title="Âge & physique">
          <div className="row" style={{ gap: 12, alignItems: 'stretch' }}>
            <div style={{ background: '#141715', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 96 }}>
              <input type="range" min={16} max={34} value={age} onChange={(e) => setAge(Number(e.target.value))} style={{ accentColor: '#c9ff3c', width: '100%' }} />
              <div className="row" style={{ alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="num" style={{ fontSize: 26, color: '#eef1ea' }}>{age}</span>
                <span style={{ font: '500 10px Sora,sans-serif', color: '#5c625c', textTransform: 'uppercase' }}>ans</span>
              </div>
            </div>
            <div className="row" style={{ flex: 1, gap: 8 }}>
              {PHYSIQUES.map((ph) => (
                <button key={ph} onClick={() => setPhysique(ph)} style={pillStyle(ph === physique)}>{PHYSIQUE_LABELS[ph]}</button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Club de départ">
          <div className="row" style={{ gap: 10 }}>
            {TIERS.map((t) => (
              <button key={t} onClick={() => setTier(t)} className={`choice${t === tier ? ' is-picked' : ''}`} style={{ flex: 1, textAlign: 'left', position: 'relative', color: 'inherit' }}>
                {t === tier && <span style={{ position: 'absolute', top: 12, right: 12, font: '700 9px Sora,sans-serif', letterSpacing: '0.5px', color: '#0c0e0d', background: '#c9ff3c', padding: '2px 7px', borderRadius: 20 }}>CHOISI</span>}
                <div style={{ font: '700 14px Sora,sans-serif', color: t === tier ? '#c9ff3c' : '#eef1ea' }}>{TIER_LABELS[t]}</div>
                <div style={{ font: '400 11px/1.4 Sora,sans-serif', color: t === tier ? '#a7b39a' : '#5c625c', marginTop: 4 }}>{TIER_BLURB[t]}</div>
              </button>
            ))}
          </div>
        </Section>

        <div className="between" style={{ marginTop: 6 }}>
          <span style={{ font: '500 12px Sora,sans-serif', color: '#5c625c' }} />
          <button className="btn-lime btn-lime--lg" disabled={!canStart} onClick={() => newCareer({ firstName: firstName.trim(), lastName: lastName.trim(), age, position, physique, clubTier: tier })}>
            {loading ? 'Création…' : 'Lancer la carrière'} {Icon.arrow({ size: 17 })}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div style={{ font: '600 11px Sora,sans-serif', letterSpacing: '1px', color: '#8a9187', textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }): JSX.Element {
  return <label style={{ display: 'block', font: '500 11px Sora,sans-serif', color: '#5c625c', marginBottom: 6 }}>{children}</label>;
}
function posStyle(active: boolean): React.CSSProperties {
  return { flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: 11, background: active ? 'rgba(201,255,60,0.12)' : '#141715', border: active ? '1px solid #c9ff3c' : '1px solid rgba(255,255,255,0.08)', font: `${active ? 700 : 600} 13px Sora,sans-serif`, color: active ? '#c9ff3c' : '#8a9187', cursor: 'pointer' };
}
function pillStyle(active: boolean): React.CSSProperties {
  return { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRadius: 11, padding: '0 6px', minHeight: 46, background: active ? 'rgba(201,255,60,0.12)' : '#141715', border: active ? '1px solid #c9ff3c' : '1px solid rgba(255,255,255,0.08)', font: `${active ? 600 : 500} 13px Sora,sans-serif`, color: active ? '#c9ff3c' : '#8a9187', cursor: 'pointer' };
}
