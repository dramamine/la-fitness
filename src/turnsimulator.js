import Damage from 'lib/damage';
import KO from './komodded';
import util from 'pokeutil';

class TurnSimulator {
  simulate(state, myMove, yourMove) {
    const mine = state.self.active;
    const yours = state.opponent.active;

    const results = [];
    // who goes first?
    if (mine.boostedStats.spd > yours.boostedStats.spd) {

    } else {

    }
  }

  _simulateMove(attacker, defender, move) {
    const dmg = Damage.getDamageResult(attacker, defender, move);
    const {koturns, kochance} = KO.predictKO(dmg, defender);
    const possible = [];
    if (koturns === 1) {
      possible.push({
        attacker,
        defender: _kill(defender),
        chance: kochance
      });
      if (kochance < 1) {
        possible.push({
          attacker,
          defender: this._takeDamage(defender, dmg * 0.85),
          chance: 1 - kochance
        });
      }
    } else {
      possible.push({
        attacker,
        defender: this._takeDamage(defender, dmg * 0.85),
        chance: 0.5
      });
      possible.push({
        attacker,
        defender: this._takeDamage(defender, dmg * 0.85),
        chance: 0.5
      });
    }
    possible.map((event) => this._applySecondaries(event, move))
      .reduce(this._arrayReducer, []);

  }

  _takeDamage(mon, dmg) {
    const res = Object.assign({}, mon);
    res.hp = Math.max(0, mon.hp - dmg);
    if (res.hp === 0) {
      return this._kill(res);
    }
    return res;
  }

  _kill(mon) {
    const res = Object.assign({}, mon);
    res.dead = true;
    res.condition = '0 fnt';
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
        possible.attacker.boosts = util.updateBoosts(possible.attacker.boosts,
          move.boosts);
      } else {
        possible.defender.boosts = util.updateBoosts(possible.defender.boosts,
          move.boosts);
      }
    }

    if (move.volatileStatus) {
      if (move.target === 'self') {
        possible.attacker.volatileStatus = move.volatileStatus;
      } else {
        possible.defender.volatileStatus = move.volatileStatus;
      }
    }

    if (!move.secondary) return possible;

    // apply effects that may or may not happen
    const secondary = move.secondary;

    // need clones so that references to objects don't get tangled
    const noproc = JSON.parse(JSON.stringify(possible));
    const procs = JSON.parse(JSON.stringify(possible));

    noproc.chance = noproc.chance * (1 - (secondary.chance / 100));
    procs.chance = procs.chance * (secondary.chance / 100);

    if (secondary.self) {
      if (secondary.self.boosts) {
        procs.attacker.boosts = util.updateBoosts(possible.attacker.boosts,
          secondary.self.boosts);
      }
    }
    if (secondary.boosts) {
      procs.defender.boosts = util.updateBoosts(possible.defender.boosts,
        secondary.boosts);
    }
    if (secondary.volatileStatus) {
      procs.defender.volatileStatus = secondary.volatileStatus;
    }

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
}

export default new TurnSimulator();
