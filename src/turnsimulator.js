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
  iterate(state, myOptions, yourOptions) {
    const futures = [];
    yourOptions = this._normalize(clone(yourOptions)); // eslint-disable-line
    myOptions.forEach((mine) => {
      yourOptions.forEach((yours) => {
        futures.push(this.simulate(state, mine, yours));
      });
    });

    return futures.reduce(this._arrayReducer, []);
  }

  compare(futures) {
    console.log('I still believe in futures', futures);
    const byChoice = futures.reduce( (prev, item) => {
      const key = item.attacker.move.id || item.attacker.species;
      if (!prev.hasOwnProperty(key)) {
        prev[key] = [];
      }
      prev[key].push(item);
      return prev;
    }, {});
    Object.keys(byChoice).forEach(choice => {
      const results = byChoice[choice];

      const fitnesses = results.map( (result) => {
        console.log('checking this result:', result);
        const {endurance, block} = Fitness.evaluateFitness(result.attacker, result.defender);
        const res = {
          attackMove: result.attacker.move.id || result.attacker.species,
          defendMove: result.defender.move.id || result.defender.species,
          attackerHp: result.attacker.hp,
          defenderHp: result.defender.hp,
          attackerStatuses: result.defender.condition,
          endurance,
          block,
          ebratio: block / endurance
        };
        return res;
      }).sort( (a, b) => b.ebratio - a.ebratio );

      console.log('heres the best situation:');
      console.log(fitnesses[0]);

      console.log('heres the worst situation:');
      console.log(fitnesses[fitnesses.length - 1]);


      // i.e.I have to endure this many hits to kill defender
      let endurance = 0;
      // i.e. I will get this many hits in before I am dead
      let block = 0;

      fitnesses.forEach(fitness => {
        endurance += fitness.endurance;
        block += fitness.block;
      });
      endurance = endurance / fitnesses.length;
      block = block / fitnesses.length;
      console.log('got avg endurance and block:', endurance, block);
      console.log('from these fitnesses:');
      console.log(fitnesses);
    });

    // const results = futures.map( (future) => {
    //   const fitnesses = future.map( (result) => {
    //     return evaluateFitness(result.attacker, result.defender);
    //   });
    //   console.log(`using fitnesses ${fitnesses} for choice ${future.choice.id}`);
    //   return {
    //     choice: future.choice,
    //     endurance: fitnesses.map(x => x.endurance).reduce( (prev, item) => {
    //       prev + prev + item;
    //     }, 0) / fitnesses.length,
    //     block: fitnesses.map(x => x.block).reduce( (prev, item) => {
    //       return prev + item;
    //     }, 0) / fitnesses.length,
    //   };
    // });
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
    const totalChance = yourChoice.chance || 1;

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
      if (mine.move.priority > yours.move.priority ||
        mine.boostedStats.spe > yours.boostedStats.spe) {
        first = mine;
        second = yours;
      } else {
        first = yours;
        second = mine;
      }
    }
    // first move.
    let futures = this._simulateMove({
      attacker: first,
      defender: second,
      chance: totalChance * (first.chance || 1) * (second.chance || 1)
    });

    // deal with some fallout
    if (first.volatileStatus === volatileStatuses.PROTECT) {
      delete first.volatileStatus;
    } else if (second.volatileStatus === volatileStatuses.FLINCH) {
      delete second.volatileStatus;
    } else {
      futures = futures.map( (possibility) => {
        const res = this._simulateMove({
          attacker: possibility.defender,
          defender: possibility.attacker,
          chance: possibility.chance
        });
        return res;
      }).reduce(this._arrayReducer, []);
    }

    if (!this._verifyTotalChance(futures, totalChance)) {
      Log.error('got wrong total from simulate');
      Log.error(mine, yours, totalChance);
      Log.error(futures);
    }

    return futures;
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
  _simulateMove({attacker, defender, chance}) {
    // console.log('simulatemove:', attacker, defender, chance);
    attacker = JSON.parse(JSON.stringify(attacker)); // eslint-disable-line
    defender = JSON.parse(JSON.stringify(defender)); // eslint-disable-line
    const move = attacker.move;


    console.log(`${attacker.species} is casting ${move.id}` );
    if (!move) {
      return {
        attacker,
        defender,
        chance
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
          chance: chance * (1 - kochance)
        });
      }
    } else {
      possible.push({
        attacker: clone(attacker),
        defender: this._takeDamage(clone(defender), dmg[0]),
        chance: chance * 0.5
      });
      possible.push({
        attacker: clone(attacker),
        defender: this._takeDamage(clone(defender), dmg[dmg.length - 1]),
        chance: chance * 0.5
      });
    }
    const applied = possible.map((event) => this._applySecondaries(event, move));
    const reduced = applied.reduce(this._arrayReducer, []);

    if (!this._verifyTotalChance(reduced, chance)) {
      Log.error('got wrong total from _simulateMove');
      Log.error(attacker, defender, chance);
      Log.error(reduced);
    }

    return reduced;
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

    if (!move.secondary) return [possible];

    // apply effects that may or may not happen
    const secondary = move.secondary;

    // need clones so that references to objects don't get tangled
    const noproc = clone(possible);
    const procs = clone(possible);

    noproc.chance = noproc.chance * (1 - (secondary.chance / 100));
    procs.chance = procs.chance * (secondary.chance / 100);

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
   * Turn objects and arrays of objects into just an array of objects
   *
   * @param  {Array} coll The collection.
   * @param  {Array|Object} item The stuff to add to the colleciton.
   * @return {Array}      The updated collection.
   */
  _arrayReducer(coll, item) {
    if (Array.isArray(item)) {
      coll = coll.concat(item); // eslint-disable-line
    } else {
      coll.unshift( item );
    }
    return coll;
  }

  /**
   * Give each item in this array an equal chance. If chance is already set
   * for any of these, subtract that out before splitting the rest of chance
   * equally.
   *
   * @param  {Array<Object>} arr An array of objects.
   *
   * @return {Array<Object>}     The same array, with the 'chance' key filled out.
   */
  _normalize(arr) {
    if (!Array.isArray(arr) || arr.length <= 0) {
      Log.error('tried to normalize something weird.');
      return arr;
    }
    // add up chances that are already set
    const existingChance = arr.reduce((prev, item) => {
      if (item.chance) { return prev + item.chance; }
      return prev;
    }, 0);

    // evenly divide up remaining chance by # of remaining items
    const chance = (1 - existingChance) /
      arr.filter( item => !item.chance ).length;

    arr.forEach(item => {
      if (!item.chance) {
        item.chance = chance;
      }
    });
    return arr;
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
