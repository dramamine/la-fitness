import Iterator from 'la-fitness/src/iterator';
import util from 'pokeutil';

describe('iterator', () => {
  describe('iterate', () => {
    let state;
    let myOptions;
    let yourOptions;
    beforeEach( () => {
      state = {
        self: {
          active: Object.assign({
            hp: 100,
            maxhp: 100,
            boostedStats: {
              spe: 95
            },
          }, util.researchPokemonById('eevee'))
        },
        opponent: {
          active: Object.assign({
            hp: 100,
            maxhp: 100,
            boostedStats: {
              spe: 105
            },
          }, util.researchPokemonById('meowth'))
        },
      };
      myOptions = [
        util.researchMoveById('waterpulse'),
        util.researchMoveById('swordsdance'),
        util.researchMoveById('toxic'),
      ];
      yourOptions = [
        util.researchMoveById('waterpulse'),
        util.researchMoveById('swordsdance'),
        util.researchMoveById('toxic'),
      ];
    });
    it('should produce some possibilities', () => {
      const futures = Iterator.iterateSingleThreaded(state, 1, myOptions, yourOptions);
      expect(futures.length).toEqual(4);
      // const total = futures.reduce( (prev, future) => {
      //   return prev + future.chance;
      // }, 0);
      // // 3 move
      // expect(total).toBeCloseTo(3, 0);

      // const doubleswords = futures.filter(({attacker, defender}) => {
      //   return attacker.boosts && attacker.boosts.atk === 2 &&
      //     defender.boosts && defender.boosts.atk === 2;
      // });
      // expect(doubleswords.length).toBe(4);
    });
    xit('should handle possible volatile statuses', () => {
      yourOptions = [
        util.researchMoveById('waterpulse')
      ];
      const futures = Iterator.iterateSingleThreaded(state, 1, myOptions, yourOptions);
      const waterpulses = futures.filter( (possibility) => {
        return possibility.defender.move.id === 'waterpulse';
      });
      expect(waterpulses.length).toBeGreaterThan(0);
      let noproc = 0;
      let yesproc = 0;
      waterpulses.forEach(waterpulse => {
        // console.log('checkin out vstatus:', waterpulse.attacker.move.id,
        //   waterpulse.attacker.volatileStatus, waterpulse.chance,
        //   waterpulse.attacker.boosts, waterpulse.defender.hp);
        if (waterpulse.attacker.volatileStatus === 'confusion') {
          yesproc += waterpulse.chance;
        } else {
          noproc += waterpulse.chance;
        }
      });
      // console.log('procs:', yesproc, noproc);
      // note that yesproc and noproc add up to 3, because we are making 3
      // different choices, and the 'chance' amounts are all based on which
      // choice we made.
      expect(yesproc * 4).toEqual(noproc);
    });
  });

  describe('_getNextNode', () => {
    const someNodes = [
      {evaluated: false, fitness: 0, depth: 1},
      {evaluated: false, fitness: 1, depth: 1},
      {evaluated: false, fitness: -1, depth: 1},
      {evaluated: true, fitness: 0, depth: 1},
      {evaluated: false, fitness: 0, depth: 0}
    ];
    it('should return the node with the best fitness', () => {
      const chosen = Iterator._getNextNode(someNodes);
      console.log('this was chosen:', chosen);
      expect(chosen.fitness).toEqual(1);
    });
    it('should not consider nodes that have been evaluated', () => {
      const chosen = Iterator._getNextNode([someNodes[3]]);
      expect(chosen).toEqual(null);
    });
    it('should not consider nodes that are too deep', () => {
      const chosen = Iterator._getNextNode([someNodes[4]]);
      expect(chosen).toEqual(null);
    });
  });
});
