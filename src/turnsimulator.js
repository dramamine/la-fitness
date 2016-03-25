import Damage from 'lib/damage';
import KO from './komodded';
import Fitness from './fitness';
import util from 'pokeutil';
import Log from 'log';
import volatileStatuses from 'constants/volatileStatuses';

const clone = (x) => {
  return JSON.parse(JSON.stringify(x));
};

class TurnSimulator {
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
  // iterate(state, myOptions, yourOptions) {
  //   const futures = [];
  //   yourOptions = this._normalize(clone(yourOptions)); // eslint-disable-line
  //   myOptions.forEach((mine) => {
  //     yourOptions.forEach((yours) => {
  //       futures.push(this.simulate(state, mine, yours));
  //     });
  //   });
  // }

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
    console.log(`simulating battle btwn ${mine.species} casting ${myChoice.id} and ${yours.species} casting ${yourChoice.id}`);

    // kinda weird, but I'm sticking these in their objects to help w/ logic.
    let first;
    let second;
    if (myChoice.species) { // I am switching out
      first = myChoice;
      if (yourChoice.species) {
        second = yourChoice;
      } else {
        second = yours;
        yours.move = yourChoice;
      }
    } else if (yourChoice.species) { // you are switching out
      first = yourChoice;
      second = mine;
      mine.move = myChoice;
    } else { // we are both performing moves
      mine.move = myChoice;
      yours.move = yourChoice;

      // who goes first?
      if (Damage.goesFirst(mine, yours)) {
        first = mine;
        second = yours;
      } else {
        first = yours;
        second = mine;
      }
    }
    // first move.
    // futures is an array of [attacker, defender, chance]
    const afterFirst = this._simulateMove({
      attacker: first,
      defender: second
    });
    let afterSecond = [];

    // deal with some fallout
    if (first.volatileStatus === volatileStatuses.PROTECT) {
      delete first.volatileStatus;
      afterSecond = afterFirst;
    } else if (second.volatileStatus === volatileStatuses.FLINCH) {
      delete second.volatileStatus;
      afterSecond = afterFirst;
    } else {
      afterFirst.forEach( (possibility) => {
        // WHOA WATCH OUT FOR THE ATK/DEF SWAP
        const res = this._simulateMove({
          attacker: possibility.defender,
          defender: possibility.attacker
        });
        res.forEach( (poss) => {
          afterSecond.push({
            attacker: poss.attacker,
            defender: poss.defender,
            chance: possibility.chance * poss.chance
          });
        });
      });
    }

    if (!this._verifyTotalChance(afterSecond)) {
      Log.error('got wrong total from simulate');
      Log.error(mine, yours, totalChance);
      Log.error(afterSecond);
    }

    return afterSecond;
  }

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
    // console.log('simulatemove:', attacker, defender, chance);
    attacker = JSON.parse(JSON.stringify(attacker)); // eslint-disable-line
    defender = JSON.parse(JSON.stringify(defender)); // eslint-disable-line
    const move = attacker.move;


    console.log(`${attacker.species} is casting ${move.id}` );
    if (!move) {
      return {
        attacker,
        defender,
        chance: 1
      };
    }

    const dmg = Damage.getDamageResult(attacker, defender, move);
    console.log('using dmg', dmg);
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
      console.log('looking at possible:');
      console.log(event.defender.hp, event.chance);
      const maybeProcs = this._applySecondaries(event, move);
      maybeProcs.forEach((proc) => {
        console.log('looking at proc:', proc.chance);
        const res = {
          attacker: proc.attacker,
          defender: proc.defender,
          chance: (proc.chance * event.chance)
        };
        console.log(event.chance, proc.chance, res.chance);
        applied.push(res);
        console.log('just pushed a proc with chance', proc.chance * event.chance);
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

    // console.log('inside secondaries:', noproc.defender.volatileStatus, procs.defender.volatileStatus);

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
