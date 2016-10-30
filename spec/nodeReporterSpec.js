import util from 'leftovers-again/lib/pokeutil';
import Iterator from 'iterator';
import nodeReporter from 'nodeReporter';
import Fitness from 'fitness';

describe('nodeReporter', () => {
  let state;
  beforeEach( () => {
    const mine = Object.assign({
      hp: 100,
      maxhp: 100,
      hppct: 100
    }, util.researchPokemonById('eevee'));
    const yours = Object.assign({
      hp: 100,
      maxhp: 100,
      hppct: 100
    }, util.researchPokemonById('meowth'));
    state = {
      self: {
        active: mine
      },
      opponent: {
        active: yours
      }
    };
  });
  it('should handle this situation', () => {
    spyOn(Fitness, '_probablyGoesFirst').and.returnValue(true);
    state.self.active.moves = [
      util.researchMoveById('surf'),
      util.researchMoveById('blazekick')
    ];
    state.self.reserve = [
      Object.assign(util.researchPokemonById('bulbasaur'), {
        hp: 100,
        maxhp: 100,
        hppct: 100
      })
    ];

    const nodes = Iterator.iterateSingleThreaded(state, 1);
    const reports = nodes.map((node) => {
      const report = nodeReporter.report(node);
      console.log(report);
      // console.log(node);
      return report;
    });
  });
});
