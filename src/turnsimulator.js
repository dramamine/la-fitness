import Damage from 'lib/damage';
import KO from './komodded';
// import Fitness from './fitness';
import util from 'pokeutil';
import Formats from 'data/formats';
import Log from 'log';
// import volatileStatuses from 'constants/volatileStatuses';

const STATUS_WEIGHTS = {
  'VICTORY': 10,
  'DEFEAT': -10
};

const clone = (x) => {
  return JSON.parse(JSON.stringify(x));
};

class TurnSimulator {
  getMyOptions(state) {
    const switches = state.self.reserve.filter(mon => {
      return !mon.active && !mon.dead;
    });
    let moves = [];
    if (state.self.active && state.self.active.moves) {
      moves = clone(state.self.active.moves);
    }
    return switches.concat(moves);
  }

  getYourOptions(state) {
    // @TODO maybe consider switches...
    // @TODO consider history
    // @TODO consider Choice Items
    if (!state.opponent.active || !state.opponent.active.species) return null;
    const moves = Formats[util.toId(state.opponent.active.species)].randomBattleMoves;
    return moves.map(move => util.researchMoveById(move));
  }

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
  iterate(state, myOptions, yourOptions, depth = 1) {
    const initialNode = {
      state,
      fitness: 0,
      depth
    };
    let nodes = [initialNode];
    while (true) { // eslint-disable-line
      const nextNode = this.getNextNode(nodes);
      if (!nextNode) break;
      Log.debug(`checking a node with fitness ${nextNode.fitness} and depth ${nextNode.depth}`);
      const moreNodes = myOptions.map((myChoice) => { // eslint-disable-line
        const evaluated = this.evaluateNode(nextNode.state, myChoice,
          clone(yourOptions), depth);
        evaluated.prevNode = nextNode;
        return evaluated;
      });
      nodes = nodes.concat(moreNodes);
      // nextNode.futures = moreNodes;
      nextNode.evaluated = true;
    }
    return nodes;
  }

  /**
   * Return the valid node with the highest fitness.
   *
   * @param  {[type]} nodes [description]
   * @return {[type]}       [description]
   */
  getNextNode(nodes) {
    const choices = nodes.filter(node => {
      if (node.evaluated) return false;
      if (node.depth === 0) return false;
      return true;
    }).sort((a, b) => b.fitness - a.fitness);
    if (choices.length === 0) return null;
    return choices[0];
  }

  evaluateNode(state, myChoice, yourOptions, depth = 1) {
    Log.debug('imagining I chose ', myChoice.id);

    // simulate each of the opponent's choices
    const whatCouldHappen = yourOptions.map((yourChoice) => {
      Log.debug('looking at your choice:', yourChoice.id);
      // an array of {state, chance} objects.
      const possibilities = this.simulate(
        state,
        myChoice,
        yourChoice
      );
      possibilities.forEach((possibility) => {
        possibility.fitness = this.rate(possibility.state);
      });
      const expectedValue = possibilities.reduce((prev, item) => {
        return prev + item.fitness * item.chance;
      }, 0);
      // possibilities might be extraneous here...
      // Log.debug('ev calculation:', yourChoice.id, expectedValue);
      return {possibilities, expectedValue, yourChoice};
    }).sort( (a, b) => a.expectedValue - b.expectedValue);
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
    // @TODO might want to update this! it's just one of many possible future
    // states.
    const updatedState = worstCase.possibilities[0].state;
    return {
      state: updatedState,
      fitness: worstCase.expectedValue,
      myChoice,
      yourChoice: worstCase.yourChoice,
      depth: depth - 1
    };
  }

  // get fitness & status of this team
  rate(state) {
    const mine = state.self.active;
    const yours = state.opponent.active;
    if (yours.dead) return STATUS_WEIGHTS.VICTORY;
    if (mine.dead) return STATUS_WEIGHTS.DEFEAT;
    return (mine.hppct - yours.hppct) / 100;
  }


  /**
   * Take a given state, and simulate what the attacker and defender will look
   * like after these specific choices are made.
   *
   * @param  {Object} state      The state object from a server request.
   * @param  {Object} myChoice   Either a {Move} or a {Pokemon} object.
   * @param  {Object} yourChoice Either a {Move} or a {Pokemon} object.
   * @property {Number} yourChoice.chance  The chance this move will occur, 1
   * otherwise. The sum of the results of this function will add up to this
   * number. Ex. if you call this with a move you think is 20% likely to occur,
   * all the possible outcomes here will sum to 0.2.
   *
   * @return {Array}  An array of 'possibilty' objects. These have the
   * properties 'attacker', 'defender', and 'chance'. You can use attacker.move
   * and defender.move to see which move was performed; if not this, then maybe
   * the Pokemon was switched out?
   */
  simulate(state, myChoice, yourChoice) {
    const mine = clone(state.self.active);
    const yours = clone(state.opponent.active);
    Log.debug(`simulating battle btwn ${mine.species} casting ${myChoice.id} and ${yours.species} casting ${yourChoice.id}`);

    if (myChoice.species) {
      mine.switch = myChoice;
      // not sure why I need this :\
      delete mine.move;
    } else {
      mine.move = myChoice;
    }

    if (yourChoice.species) {
      yours.switch = yourChoice;
      delete yours.move;
    } else {
      yours.move = yourChoice;
    }


    let mineGoesFirst;
    if (mine.species) { // I am switching out
      mineGoesFirst = true;
      Log.debug('im first');
    } else if (yours.species) { // you are switching out
      mineGoesFirst = false;
    } else { // we are both performing moves
      mineGoesFirst = Damage.goesFirst(mine, yours);
    }

    // Log.debug('mineGoesFirst? ', mineGoesFirst);

    const first = mineGoesFirst ? mine : yours;
    const second = mineGoesFirst ? yours : mine;

    // first move.
    // afterFirst is an array of [attacker, defender, chance]
    let afterFirst;
    if (first.move) {
      afterFirst = this._simulateMove({attacker: first, defender: second});
    } else {
      const switched = clone(first.switch);
      switched.switch = first.species; // ?? to know we switched?
      Log.debug('switched:', switched);
      afterFirst = [{attacker: switched, defender: second, chance: 1}];
      Log.debug('switched! afterFirst is now', afterFirst);
    }

    // Log.debug('after first move, mine is:', afterFirst[0].attacker.species);
    const afterSecond = [];

    afterFirst.forEach( (possibility) => {
      if (second.move) {
        Log.debug('looking at possibility:', possibility);
        // next move.
        // WHOA WATCH OUT FOR THE ATK/DEF SWAP
        const res = this._simulateMove({
          attacker: possibility.defender,
          defender: possibility.attacker
        });

        // Log.debug('after second move, attacker is:', res[0].attacker.species);
        res.forEach( (poss) => {
          // notice that we convert back from attacker/defender distinction.
          const withChance = {
            state: clone(state),
            chance: possibility.chance * poss.chance
          };
          // if mine goes first, then it was attacker on first round and defender
          // on second round.
          if (mineGoesFirst) {
            withChance.state.self.active = poss.defender;
            withChance.state.opponent.active = poss.attacker;
          } else {
            withChance.state.self.active = poss.attacker;
            withChance.state.opponent.active = poss.defender;
          }
          afterSecond.push(withChance);
        });
      } else {
        // we both switched out, lawl.
        const switched = second.switch;
        switched.switch = second.species;
        // gotta maybe switch back.
        const withChance = {
          state: clone(state),
          chance: possibility.chance
        };
        // don't need conditionals here, bc mineGoesFirst is always true.
        // (you can't have a move happen first and a switch happen second)
        withChance.state.self.active = possibility.attacker;
        withChance.state.opponent.active = switched;
        afterSecond.push(withChance);
      }
      // Log.debug('then mine is: ', afterSecond[afterSecond.length - 1].mine.species);
    });
    Log.debug('afterSecond became:', JSON.stringify(afterSecond));

    if (!this._verifyTotalChance(afterSecond)) {
      Log.error('got wrong total from simulate');
      Log.error(mine, yours);
      Log.error(afterSecond);
    }

    return afterSecond;
  }

  // swap(simulation) {
  //   const defender = simulation.defender;
  //   simulation.defender = simulation.attacker;
  //   simulation.attacker = defender;
  //   return simulation;
  // }

  /**
   * Simulates a move by splitting it into possibilities (kills, 100% dmg moves
   * and 85% dmg moves), then further splitting those possibilities by their
   * secondary effects.
   *
   * @param  {[type]} attacker [description]
   * @param  {[type]} defender [description]
   * @param  {[type]} move     [description]
   * @return {[type]}          [description]
   */
  _simulateMove({attacker, defender}) {
    // Log.debug('simulatemove:', attacker, defender, chance);
    attacker = JSON.parse(JSON.stringify(attacker)); // eslint-disable-line
    defender = JSON.parse(JSON.stringify(defender)); // eslint-disable-line
    const move = attacker.move;


    // Log.debug(`${attacker.species} is casting ${move.id}` );
    if (!move) {
      return {
        attacker,
        defender,
        chance: 1
      };
    }

    const dmg = Damage.getDamageResult(attacker, defender, move);
    // Log.debug('using dmg', dmg);
    // const dmg = 40;
    const {koturns, kochance} = KO.predictKO(dmg, defender);
    const possible = [];
    if (koturns === 1) {
      possible.push({
        attacker: clone(attacker),
        defender: _kill(clone(defender)),
        chance: kochance
      });
      if (kochance < 1) {
        possible.push({
          attacker: clone(attacker),
          defender: this._takeDamage(clone(defender), dmg[0]),
          chance: (1 - kochance)
        });
      }
    } else {
      // 50% chance for max damage; 50% chance for min damage.
      possible.push({
        attacker: clone(attacker),
        defender: this._takeDamage(clone(defender), dmg[0]),
        chance: 0.5
      });
      possible.push({
        attacker: clone(attacker),
        defender: this._takeDamage(clone(defender), dmg[dmg.length - 1]),
        chance: 0.5
      });
    }
    const applied = [];
    possible.forEach((event) => {
      // Log.debug('looking at possible:');
      // Log.debug(event.defender.hp, event.chance);
      const maybeProcs = this._applySecondaries(event, move);
      maybeProcs.forEach((proc) => {
        // Log.debug('looking at proc:', proc.chance);
        const res = {
          attacker: proc.attacker,
          defender: proc.defender,
          chance: (proc.chance * event.chance)
        };
        // Log.debug(event.chance, proc.chance, res.chance);
        applied.push(res);
        // Log.debug('just pushed a proc with chance', proc.chance * event.chance);
      });
    });

    if (!this._verifyTotalChance(applied)) {
      Log.error('got wrong total from _simulateMove');
      Log.error(attacker);
      Log.error(defender);
      Log.error(applied);
    }

    return applied;
  }


  /**
   * Apply effects, such as status effects, boosts, unboosts, and volatile
   * statuses.
   *
   * @TODO handle PROTECT and FLINCH
   *
   * @param  {[type]} possible [description]
   * @param  {[type]} move     [description]
   * @return {[type]}          [description]
   */
  _applySecondaries(possible, move) {
    // handle moves that always boost or unboost
    if (move.boosts) {
      if (move.target === 'self') {
        possible.attacker.boosts = util.boostCombiner(possible.attacker.boosts,
          move.boosts);
      } else {
        possible.defender.boosts = util.boostCombiner(possible.defender.boosts,
          move.boosts);
      }
    }

    // handle status moves
    if (move.status) {
      possible.defender.statuses = possible.defender.statuses || [];
      possible.defender.statuses.push(move.status);
    }

    if (move.volatileStatus) {
      if (move.target === 'self') {
        possible.attacker.volatileStatus = move.volatileStatus;
      } else {
        possible.defender.volatileStatus = move.volatileStatus;
      }
    }

    if (!move.secondary) {
      return [{
        attacker: possible.attacker,
        defender: possible.defender,
        chance: 1
      }];
    }

    // apply effects that may or may not happen
    const secondary = move.secondary;

    // need clones so that references to objects don't get tangled
    const noproc = clone(possible);
    const procs = clone(possible);

    noproc.chance = (1 - (secondary.chance / 100));
    procs.chance = (secondary.chance / 100);

    if (secondary.self) {
      if (secondary.self.boosts) {
        procs.attacker.boosts = util.boostCombiner(possible.attacker.boosts,
          secondary.self.boosts);
      }
    }
    if (secondary.boosts) {
      procs.defender.boosts = util.boostCombiner(possible.defender.boosts,
        secondary.boosts);
    }
    if (secondary.volatileStatus) {
      if (move.target === 'self') {
        procs.attacker.volatileStatus = secondary.volatileStatus;
      } else {
        procs.defender.volatileStatus = secondary.volatileStatus;
      }
    }

    // Log.debug('inside secondaries:', noproc.defender.volatileStatus, procs.defender.volatileStatus);

    return [noproc, procs];
  }

  /**
   * Aplly damage to our pokemon.
   * @param  {[type]} mon [description]
   * @param  {[type]} dmg [description]
   * @return {[type]}     [description]
   */
  _takeDamage(mon, dmg) {
    const res = clone(mon);
    res.hp = Math.max(0, mon.hp - dmg);
    if (res.hp === 0) {
      return this._kill(res);
    }
    res.hppct = 100 * res.hp / res.maxhp;
    return res;
  }

  _kill(mon) {
    const res = clone(mon);
    res.dead = true;
    res.condition = '0 fnt';
    res.hp = 0;
    return res;
  }

  /**
   * Verify that our chance fields add up.
   *
   * @param  {[type]} arr      [description]
   * @param  {Number} expected [description]
   * @return {[type]}          [description]
   */
  _verifyTotalChance(arr, expected = 1) {
    const total = arr.reduce( (prev, item) => {
      return prev + item.chance || 0;
    }, 0);

    if (total > expected * 0.99 && total < expected * 1.01) {
      return true;
    }
    Log.error('Wrong total!' + total);
    return false;
  }
}
export default new TurnSimulator();
