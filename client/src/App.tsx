// Top-level screen switch. No router lib — the store holds the route.
import { useGame } from './store/game';
import { Onboarding } from './screens/Onboarding';
import { Hub } from './screens/Hub';
import { Conversation } from './screens/Conversation';
import { Training } from './screens/Training';
import { MatchDay } from './screens/MatchDay';
import { Career } from './screens/Career';
import { Inbox } from './screens/Inbox';

export function App(): JSX.Element {
  const { state, booting, route, toast } = useGame();

  if (booting) {
    return (
      <div className="splash">
        <div className="spinner" />
        <div style={{ font: '500 13px Sora,sans-serif', color: 'var(--muted)' }}>Chargement de ta carrière…</div>
      </div>
    );
  }

  const screen = () => {
    if (!state) return <Onboarding />;
    switch (route) {
      case 'onboarding': return <Onboarding />;
      case 'hub': return <Hub />;
      case 'conversation': return <Conversation />;
      case 'training': return <Training />;
      case 'match': return <MatchDay />;
      case 'career': return <Career />;
      case 'inbox': return <Inbox />;
      default: return <Hub />;
    }
  };

  return (
    <div className="stage">
      {screen()}
      {toast && (
        <div className="toast-wrap">
          <div className="toast"><span className="brand-dot" />{toast}</div>
        </div>
      )}
    </div>
  );
}
