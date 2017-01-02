import Formats from 'leftovers-again/lib/data/formats';
import Log from 'leftovers-again/lib/log';
import Fitness from './fitness';
import TurnSimulator from './turnsimulator';

class Evaluator {

  evaluateNode(node, myChoice, yourOptions) {
    const {depth, state} = node;
    Log.debug('imagining I chose ' + myChoice.id);

    // simulate each of the opponent's choices
    const whatCouldHappen = yourOptions.map((yourChoice) => {
      // this is an array of {state, chance} objects.
      const possibilities = TurnSimulator.simulate(
        state,
        myChoice,
        yourChoice
      );

      // get 'fitness details' for each of these states
      possibilities.forEach((possibility) => {
        if (isNaN(possibility.state.self.active.hp)) {
          console.log('stop the presses');
          process.exit();
        }

        possibility.fitness = Fitness.rate(possibility.state, depth);
        possibility.fitness.chance = possibility.chance;
      });

      // get 'fitness summaries' for each of these states.
      // note that each possibility has a certain fitness object,
      // and 'possibilities' has a different fitness object (different properties)
      possibilities.fitness = Fitness.summarize(possibilities);

      // possibilities might be extraneous here...
      // Log.debug('ev calculation:', yourChoice.id, expectedValue);
      return {possibilities, yourChoice};
    }).sort( (a, b) => a.possibilities.fitness.expectedValue - b.possibilities.fitness.expectedValue);
    // Log.debug('made it past teh loop');
    // at this point, whatCouldHappen is an array of all the resulting situations
    // from our opponent's choice. it's sorted by expected value, so the first
    // entry is the worst situation for us. note that this is a big assumption
    // on our part - maybe our opponent can't even perform that move, or maybe
    // we switched into another Pokemon and our opponent would never have guessed
    // about it IRL. but we're still making it.


    // Log.debug('worst-case scenario:', whatCouldHappen[0].yourChoice.id);
    // Log.debug(whatCouldHappen[0]);
    // Log.debug('best-case scenario:', whatCouldHappen[whatCouldHappen.length - 1].yourChoice.id);
    // Log.debug(whatCouldHappen[whatCouldHappen.length - 1]);

    const worstCase = whatCouldHappen[0];


    const evaluated = {
      prevNode: node,
      state: worstCase.possibilities[0].state,
      fitness: worstCase.possibilities.fitness,
      myChoice,
      yourChoice: worstCase.yourChoice,
      depth: depth - 1
    };

    // imagine what would happen if your opponent used their second-best move
    // instead. you can look at the fitness differential between the possible
    // fitnesses here and decide if it's worth taking this risk and playing
    // less conservatively.
    if (whatCouldHappen.length > 1) {
      const betterCase = whatCouldHappen[1];
      evaluated.betterCase = {
        risk: this._considerSecondWorstCase(state, worstCase, betterCase),
        fitness: betterCase.possibilities.fitness
      };
    }

    if (evaluated.state.self.active.dead || evaluated.state.opponent.active.dead
      || evaluated.depth === 0) {
      evaluated.terminated = true;
    }

    return evaluated;
  }

  /**
   * @TODO
   *
   *
   * @param  {[type]} state      [description]
   * @param  {[type]} worstCase  [description]
   * @param  {[type]} betterCase [description]
   * @return {[type]}            [description]
   */
  _considerSecondWorstCase(state, worstCase, betterCase) {
    let risk = 1;

    // has used this before, but decides not to this turn
    const hasUsedThisBefore = 0.5;
    if (state.opponent.active.seenMoves &&
      state.opponent.active.seenMoves.indexOf(worstCase.yourChoice.id) > -1) {
      risk *= hasUsedThisBefore;
    } else {
      // chance he doesn't have this move
      let known = 0;
      if (state.opponent.active.seenMoves) {
        known = state.opponent.active.seenMoves.length;
      }
      const emptySlots = 4 - known;
      if (emptySlots < 0 || emptySlots > 4) {
        Log.error('calculated emptySlots wrong', state.opponent.active.seenMoves);
      }
      const possibleMoves = Formats[state.opponent.active.id].randomBattleMoves.length
        - known;
      const chanceHeHasMoveWeHaventSeen = emptySlots / possibleMoves;
      risk *= 1 - chanceHeHasMoveWeHaventSeen;
    }

    return risk;
  }

}

export default new Evaluator();
