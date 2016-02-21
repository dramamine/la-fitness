import util from 'pokeutil';
import TurnSimulator from 'la-fitness/src/turnsimulator';

fdescribe('turn simulator', () => {
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
});
