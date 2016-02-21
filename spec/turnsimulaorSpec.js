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
});
