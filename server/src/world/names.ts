// ============================================================
// Fictional name pools. Everything in ONZE is invented — no real
// clubs, players or journalists (licensing). Deterministic picks
// come from the seeded RNG so a career regenerates identically.
// ============================================================

export const FIRST_NAMES = [
  'Lucas', 'Nathan', 'Théo', 'Enzo', 'Mathis', 'Adam', 'Rayan', 'Noah',
  'Gabriel', 'Sacha', 'Malo', 'Ilyes', 'Aaron', 'Camille', 'Ryad', 'Marius',
  'Yanis', 'Elias', 'Kylian', 'Amine',
];

export const LAST_NAMES = [
  'Moreau', 'Lefort', 'Vasseur', 'Chevalier', 'Bonnet', 'Marchand', 'Delaunay',
  'Fontaine', 'Perrault', 'Guérin', 'Roussel', 'Lemoine', 'Barbier', 'Reynaud',
  'Camara', 'Diallo', 'Traoré', 'Sylla', 'Nkemba', 'Costa', 'Ferrand', 'Pires',
];

// City roots + club suffixes → fictional clubs like "AC Verdun", "Racing Amance".
export const CITY_ROOTS = [
  'Verdun', 'Amance', 'Roville', 'Belcourt', 'Montreux', 'Sarane', 'Ostende',
  'Faucon', 'Louvain', 'Perreux', 'Vireuil', 'Castel', 'Nérac', 'Aubagne',
  'Granville', 'Meyrin', 'Tanay', 'Colmier', 'Ravel', 'Sauvigny', 'Brémont',
  'Aubève', 'Fresnes', 'Louvières',
];

export const CLUB_PREFIXES = ['AC', 'Racing', 'FC', 'US', 'AS', 'Olympique', 'Sporting', 'Entente'];

export const AGENT_NAMES = ['Karim Belkaïd', 'Sonia Vidal', 'Marc Ottenin', 'Djibril Sané'];
export const COACH_NAMES = ['Coach Renard', 'Coach Vasseur', 'Coach Prigent', 'Coach Da Silva'];
export const TEAMMATE_NAMES = ['Théo Ravel', 'Malik Coulibaly', 'Bastien Neyret', 'Sami Oualid'];
export const JOURNALIST_OUTLETS = ['La Tribune Sport', 'Onze Actu', 'Le Onze', 'Sud-Foot'];
export const JOURNALIST_NAMES = ['Hélène Fabre', 'Paul Vasco', 'Nadia Krimi', 'Franck Ledru'];

export function shortTag(name: string): string {
  // last word, first 3 letters uppercased → e.g. "AC Verdun" → "VER"
  const word = name.split(' ').slice(-1)[0];
  return word.slice(0, 3).toUpperCase();
}
