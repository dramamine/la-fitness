import Damage from 'lib/damage';
import KO from './komodded';


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

  _applySecondaries(possible, move) {

    // handle moves that always boost or unboost
    if (move.boosts) {
      if (target === 'self') {
        possible.attacker.boosts = util.updateBoosts(possible.attacker.boosts,
          move.boosts);
      } else {
        possible.defender.boosts = util.updateBoosts(possible.defender.boosts,
          move.boosts);
      }
    }

    if (move.volatileStatus) {
      if (target === 'self') {
        possible.attacker.volatileStatus = move.volatileStatus;
      } else {
        possible.defender.volatileStatus = move.volatileStatus;
      }
    }

    if (!move.secondary) return possible;

    // apply effects that may or may not happen
    const secondary = move.secondary;
    const noproc = Object.assign(
      // chance that this thing does not happen.
      {chance: possible.chance * (1 - (secondary.chance / 100))}
    , possible);
    const procs = Object.assign(
      {chance: possible.chance * (secondary.chance / 100)}
    , possible);

    // apply
    if (secondary.self) {
      if (secondary.self.boosts) {
        possible.attacker.boosts = util.updateBoosts(possible.attacker.boosts,
          secondary.self.boosts);
      }
    }
    if (secondary.boosts) {
      possible.defender.boosts = util.updateBoosts(possible.defender.boosts,
        secondary.self.boosts);
    }
    if (secondary.volatileStatus) {
      possible.defender.volatileStatus = secondary.volatileStatus;
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
      coll = coll.concat(item); // eslint-disable-line param-reassign
    } else {
      coll.unshift( item );
    }
    return coll;
  }
}

export default new TurnSimulator();
