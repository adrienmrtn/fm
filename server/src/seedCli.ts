// Dev helper: seed a demo career straight into the DB and print its id.
// Run with: npm run seed -w @onze/server

import { seedNewCareer } from './world/seeder.js';
import { saveGame } from './db/store.js';
import { playerOverall } from './engine/player.js';

const game = seedNewCareer({
  firstName: 'Lucas',
  lastName: 'Moreau',
  age: 19,
  position: 'AIL',
  physique: 'equilibre',
  clubTier: 'ligue2',
});
saveGame(game);

console.log('Seeded career:', game.id);
console.log('Player:', game.player.firstName, game.player.lastName, '· overall', playerOverall(game.player));
console.log('Club:', game.club.name, '· league', game.league.name, '·', game.clubs.length, 'clubs');
console.log('Fixtures:', game.allFixtures.length, '· characters', game.characters.length);
