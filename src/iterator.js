import Evaluator from './evaluator';
import Formats from 'data/formats';
import util from 'pokeutil';
import Log from 'log';

class Iterator {

  /**
   * Iterate through each of our choices and the opponent's choices.
   *
   * @param  {[type]} state       The original state.
   * @param  {[type]} myOptions   An array of moves and Pokemon objects
   * representing the choices we might make.
   * @param  {[type]} yourOptions An array of moves and Pokemon objects
   * representing the choices the opponent might make.
   * @return {[type]}             [description]
   */
  iterateSingleThreaded(state, depth = 1, myOptions = null, yourOptions = null) {
    if (!myOptions) {
      myOptions = this.getMyOptions(state);
    }
    if (!yourOptions) {
      yourOptions = this.getYourOptions(state);
    }

    const initialNode = {
      state,
      fitness: 0,
      depth
    };
    let nodes = [initialNode];
    while (true) { // eslint-disable-line
      const nextNode = this._getNextNode(nodes);
      if (!nextNode) {
        Log.debug('ran out of nodes to check.');
        break;
      }
      Log.debug(`checking a node with fitness ${nextNode.fitness} and depth ${nextNode.depth}`);
      const moreNodes = myOptions.map((myChoice) => { // eslint-disable-line
        Log.debug('my choice:' + JSON.stringify(myChoice));
        const evaluated = Evaluator.evaluateNode(nextNode.state, myChoice,
          util.clone(yourOptions), depth);
        console.log(`imagining I chose ${evaluated.myChoice.id} and you chose ` +
          `${evaluated.yourChoice.id}: ${evaluated.fitness}`);
        evaluated.prevNode = nextNode;
        return evaluated;
      });
      nodes = nodes.concat(moreNodes);
      // nextNode.futures = moreNodes;
      nextNode.evaluated = true;
    }
    return nodes;
  }

  getMyOptions(state) {
    const switches = state.self.reserve.filter(mon => {
      return !mon.active && !mon.dead;
    });
    let moves = [];
    if (!state.forceSwitch && !state.teamPreview && state.self.active &&
      state.self.active.moves) {
      moves = util.clone(state.self.active.moves)
        .filter(move => !move.disabled);
    }
    return switches.concat(moves);
  }

  // _checkSituationalMoves(state, mon, move) {
  //   switch (move.id) {
  //   case 'fakeout':
  //     if (state.events.find(event => event.move === 'fakeout' &&
  //       event.from === state.mon.species )) {
  //       return false;
  //     }
  //     break;
  //   default:
  //     break;
  //   }
  //   return true;
  // }

  getYourOptions(state) {
    // @TODO maybe consider switches...
    // @TODO consider history
    // @TODO consider Choice Items
    if (!state.opponent.active || !state.opponent.active.species) return null;
    const moves = Formats[util.toId(state.opponent.active.species)].randomBattleMoves;
    return moves.map(move => util.researchMoveById(move));
  }

  /**
   * Return the valid node with the highest fitness.
   *
   * @param  {[type]} nodes [description]
   * @return {[type]}       [description]
   */
  _getNextNode(nodes) {
    const choices = nodes.filter(node => {
      if (node.evaluated) return false;
      if (node.depth === 0) return false;
      return true;
    }).sort((a, b) => b.fitness - a.fitness);
    if (choices.length === 0) return null;
    return choices[0];
  }



}

export default new Iterator();
