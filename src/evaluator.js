import Formats from 'data/formats';
import Util from 'pokeutil';
import TurnSimulator from './turnsimulator';
import Damage from 'lib/damage';

class Evaluator {
  constructor() {

  }

  // cycle through every state
  evaluate(state) {
    const attacker = state.self.active;
    const defender = state.opponent.active;
    // Damage.calculateStats

    const myMoves = attacker.moves.filter(move => !move.disabled);
    const mySwitches = state.self.reserve.filter(mon => !mon.active);
    const yourMoves = Formats[Util.toId(defender.species)].randomBattleMoves
      .map(id => Util.researchMoveById(id));

    const futures = TurnSimulator.iterate(state, myMoves.concat(mySwitches), yourMoves);
    return futures;
  }

}

export default new Evaluator();
