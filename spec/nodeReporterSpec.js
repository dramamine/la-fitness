import util from 'pokeutil';
import turnsimulator from 'la-fitness/src/turnsimulator';
import nodeReporter from 'la-fitness/src/nodeReporter';

fdescribe('nodeReporter', () => {
  let state;
  beforeEach( () => {
    const mine = Object.assign({
      hp: 100,
      maxhp: 100
    }, util.researchPokemonById('eevee'));
    const yours = Object.assign({
      hp: 100,
      maxhp: 100
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
    state.self.active.moves = [
      util.researchMoveById('surf'),
      util.researchMoveById('blazekick')
    ];
    state.self.reserve = [
      util.researchPokemonById('bulbasaur')
    ];
    const myOptions = turnsimulator.getMyOptions(state);
    const yourOptions = turnsimulator.getYourOptions(state);

    const nodes = turnsimulator.iterate(state, myOptions, yourOptions, 1);
    const reports = nodes.map((node) => {
      const report = nodeReporter.report(node);
      console.log(report);
      return report;
    });
  });
});
