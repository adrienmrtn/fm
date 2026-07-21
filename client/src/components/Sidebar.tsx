// Left navigation rail, shared by every in-game screen (from the maquette).
import { POSITION_SHORT } from '@onze/shared';
import { useGame, type Route } from '../store/game';
import { Avatar, Bar, Icon } from './ui';

type NavKey = 'accueil' | 'messagerie' | 'carriere' | 'entrainement';

const NAV: { key: NavKey; label: string; route: Route; icon: () => JSX.Element }[] = [
  { key: 'accueil', label: 'Accueil', route: 'hub', icon: () => Icon.home() },
  { key: 'messagerie', label: 'Messagerie', route: 'inbox', icon: () => Icon.message() },
  { key: 'carriere', label: 'Carrière', route: 'career', icon: () => Icon.user() },
  { key: 'entrainement', label: 'Entraînement', route: 'training', icon: () => Icon.training() },
];

const ROUTE_TO_NAV: Partial<Record<Route, NavKey>> = {
  hub: 'accueil',
  inbox: 'messagerie',
  conversation: 'messagerie',
  career: 'carriere',
  training: 'entrainement',
};

export function Sidebar(): JSX.Element {
  const { state, route, navigate, advanceWeek, loading } = useGame();
  if (!state) return <aside className="sidebar" />;

  const active = ROUTE_TO_NAV[route];
  const unread = state.notifications.filter((n) => n.unread).length;
  const p = state.player;
  const formLabel = p.form >= 82 ? 'En feu' : p.form >= 64 ? 'Bonne' : p.form >= 42 ? 'Neutre' : 'Fébrile';

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand-dot" />
        <span className="brand-word">ONZE</span>
      </div>
      <div className="sidebar__season">Saison {state.season}</div>

      <nav className="nav">
        {NAV.map((item) => (
          <button key={item.key} className={`nav__item${active === item.key ? ' is-active' : ''}`} onClick={() => navigate(item.route)}>
            <span className="nav__icon">{item.icon()}</span>
            <span className="nav__label">{item.label}</span>
            {item.key === 'messagerie' && unread > 0 && <span className="badge-pill">{unread}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar__spacer" />

      <div className="mini-player">
        <div className="row" style={{ alignItems: 'center', gap: 11 }}>
          <Avatar initials={`${p.firstName[0]}${p.lastName[0]}`} size={42} />
          <div className="min0">
            <div style={{ font: '600 14px Sora,sans-serif', color: 'var(--text)', whiteSpace: 'nowrap' }}>
              {p.firstName} {p.lastName}
            </div>
            <div style={{ font: '500 11px Sora,sans-serif', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {state.club.name} · {POSITION_SHORT[p.position]}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 13 }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: '500 8.5px Sora,sans-serif', letterSpacing: '0.5px', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 6 }}>Forme</div>
            <span className="tag tag--green">{formLabel}</span>
          </div>
          <div style={{ flex: 1.3 }}>
            <div style={{ font: '500 8.5px Sora,sans-serif', letterSpacing: '0.5px', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 9 }}>Forme physique</div>
            <Bar value={p.fitness} />
          </div>
        </div>
      </div>

      <button className="btn-lime btn-lime--block" disabled={loading} onClick={advanceWeek}>
        Avancer la semaine {Icon.arrow({ size: 16 })}
      </button>
    </aside>
  );
}
