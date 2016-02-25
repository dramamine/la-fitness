import util from 'pokeutil';
import TurnSimulator from 'la-fitness/src/turnsimulator';

describe('turn simulator', () => {
  describe('_arrayReducer', () => {
    it('should turn objects and arrays of objects into an array of objects', () => {
      const attacker = util.researchPokemonById('eevee');
      const defender = util.researchPokemonById('meowth');
      const possible = [
        [
          {
            attacker,
            defender,
            chance: 0.125
          },
          {
            attacker,
            defender,
            chance: 0.125
          },
        ],
        {
          attacker,
          defender,
          chance: 0.5
        },
        [
          {
            attacker,
            defender,
            chance: 0.125
          },
          {
            attacker,
            defender,
            chance: 0.125
          },
        ],
      ];
      const reduced = possible.reduce(TurnSimulator._arrayReducer, []);
      console.log(reduced);
      expect(reduced.length).toBe(5);
    });
  });
  describe('_applySecondaries', () => {
    it('should handle a self-boosting move', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'self',
        boosts: {atk: 2}
      };
      const res = TurnSimulator._applySecondaries(possible, possible.attacker.move);
      expect(res.attacker.boosts.atk).toEqual(2);
    });

    it('should handle a stat lowering move', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'normal',
        boosts: {atk: -2}
      };
      const res = TurnSimulator._applySecondaries(possible, possible.attacker.move);
      expect(res.defender.boosts.atk).toEqual(-2);
    });

    it('should handle a self-boosting volatile status', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'self',
        volatileStatus: 'awesome'
      };
      const res = TurnSimulator._applySecondaries(possible, possible.attacker.move);
      expect(res.attacker.volatileStatus).toBe('awesome');
    });

    it('should handle a volatile status move', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'normal',
        volatileStatus: 'paralysis'
      };
      const res = TurnSimulator._applySecondaries(possible, possible.attacker.move);
      expect(res.defender.volatileStatus).toBe('paralysis');
    });

    it('should apply possible effects', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'normal',
        secondary: {
          volatileStatus: 'paralysis',
          chance: 50
        }
      };

      const [noproc, procs] = TurnSimulator._applySecondaries(possible, possible.attacker.move);

      expect(noproc.defender.volatileStatus).toBeUndefined();
      expect(noproc.chance).toBe(0.5);

      expect(procs.defender.volatileStatus).toBe('paralysis');
      expect(procs.chance).toBe(0.5);
    });

    it('should apply possible boosts', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'normal',
        secondary: {
          boosts: {atk: -1},
          chance: 30
        }
      };

      const [noproc, procs] = TurnSimulator._applySecondaries(possible, possible.attacker.move);

      expect(noproc.defender.boosts).toBeUndefined();
      expect(noproc.chance).toBe(0.7);

      expect(procs.defender.boosts.atk).toBe(-1);
      expect(procs.chance).toBe(0.3);
    });
  });
  describe('_normalize', () => {
    it('should give equal chance to all things', () => {
      const stuff = [{}, {}, {}, {}];
      TurnSimulator._normalize(stuff);
      expect(stuff[0].chance).toEqual(0.25);
      expect(stuff[1].chance).toEqual(0.25);
      expect(stuff[2].chance).toEqual(0.25);
      expect(stuff[3].chance).toEqual(0.25);
    });
    it('should subtract an existing chance', () => {
      const stuff = [{chance: 0.4}, {}, {}];
      TurnSimulator._normalize(stuff);
      expect(stuff[0].chance).toEqual(0.4);
      expect(stuff[1].chance).toEqual(0.3);
      expect(stuff[2].chance).toEqual(0.3);
    });
  });
  describe('simulate', () => {
    it('should produce results', () => {
      const state = {
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
      const myMove = util.researchMoveById('dragonrage');
      const yourMove = util.researchMoveById('dragonrage');
      const res = TurnSimulator.simulate(state, myMove, yourMove);
      expect(res.length).toEqual(4);
      expect(res[0].chance).toEqual(0.25);
      expect(res[3].chance).toEqual(0.25);
    });
  });
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
      const futures = TurnSimulator.iterate(state, myOptions, yourOptions);

      const total = futures.reduce( (prev, future) => {
        return prev + future.chance;
      }, 0);
      // 3 move
      expect(total).toBeCloseTo(3, 0);

      const doubleswords = futures.filter(({attacker, defender}) => {
        return attacker.boosts && attacker.boosts.atk === 2 &&
          defender.boosts && defender.boosts.atk === 2;
      });
      expect(doubleswords.length).toBe(4);
    });
    it('should handle possible volatile statuses', () => {
      yourOptions = [
        util.researchMoveById('waterpulse')
      ];
      const futures = TurnSimulator.iterate(state, myOptions, yourOptions);
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
      console.log('procs:', yesproc, noproc);
      // note that yesproc and noproc add up to 3, because we are making 3
      // different choices, and the 'chance' amounts are all based on which
      // choice we made.
      expect(yesproc * 4).toEqual(noproc);
    });
  });
  describe('compare', () => {
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
    fit('should produce some possibilities', () => {
      const futures = TurnSimulator.iterate(state, myOptions, yourOptions);
      const comparison = TurnSimulator.compare(futures);
      console.log(comparison);
    });
  });
});
