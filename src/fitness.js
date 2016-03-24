/**
 * Get some helpful info about pokemon & their moves
 *
 */
import Damage from 'lib/damage';
import Formats from 'data/formats';
import Util from 'pokeutil';

class Fitness {
  constructor() {
  }

  evaluateFitness(mine, yours) {
    // from state, hits I will endure to kill opponent
    const endurance = this._getHitsEndured(mine, yours);

    // from state, hits opponent will endure to kill me
    const block = this._getHitsEndured(yours, mine);

    return { endurance, block };
  }

  // @TODO the whole thing
  // @TODO apply speed buffs, ex. paralysis with and without 'Quick Feet'
  _probablyGoesFirst(attacker, defender, move) {
    if (move.priority > 0) return true;
    if (move.priority < 0) return false;

    const speedA = attacker.boostedStats
      ? attacker.boostedStats.spe
      : attacker.stats.spe;

    const speedB = defender.boostedStats
      ? defender.boostedStats.spe
      : defender.stats.spe;
    return (speedA > speedB);
  }

  _getMaxDmg(attacker, defender) {
    let maxDmg = 0;
    let bestMove;
    const moves = attacker.moves ||
      Formats[Util.toId(attacker.species)].randomBattleMoves
      .map(id => Util.researchMoveById(id));

    moves.forEach( (move) => {
      if (move.disabled) return;
      let est = -1;
      try {
        est = Damage.getDamageResult(
          attacker,
          defender,
          move,
          {},
          true
        );
      } catch (e) {
        console.log(e);
      }
      if (est > maxDmg) {
        maxDmg = est;
        bestMove = move;
      }
    });
    return {maxDmg, bestMove};
  }

  /**
   * How many hits can the defender endure?
   * i.e. how many of his turns can he get off before I kill him?
   *
   * @param  {[type]} attacker [description]
   * @param  {[type]} defender [description]
   * @return {[type]}          [description]
   */
  _getHitsEndured(attacker, defender) {
    // just using max dmg to keep it simple. most moves have the same 'spread'
    // so I'm not too worried about this.
    const {maxDmg, bestMove} = this._getMaxDmg(attacker, defender);

    // @TODO shouldn't have to do this.
    if (!attacker.conditions) attacker.conditions = '';
    if (!defender.conditions) defender.conditions = '';

    let statusDmg = 0;
    // @TODO burn needs to wear off
    if (defender.conditions.indexOf('brn') >= 0) {
      statusDmg += defender.maxhp / 8; // @TODO does this exist
    }
    if (defender.conditions.indexOf('psn') >= 0) {
      statusDmg += defender.maxhp / 8; // @TODO does this exist
    }

    // @TODO do I have any priority moves that would OHKO?
    const isFirst = this._probablyGoesFirst(attacker, defender, bestMove);
    let hitsEndured = 0; // 10 is pretty bad.
    let remainingHP = defender.hp; // @TODO does this exist

    // subtracting out HPs here - we have the KO Chance library code available
    // but it seems like overkill and I"m worried about performance. also the
    // KO library doesn't give us as much flexibility with status effect
    // damage.
    while (hitsEndured < 10) {
      if (remainingHP === null) {
        console.log('bailing out! missing hp', attacker, defender);
        exit;
      }
      // console.log(`isfirst: ${isFirst}, remaining HP: ${remainingHP} dmg: ${maxDmg}`);
      if (isFirst) {
        remainingHP -= maxDmg;
      }

      if (remainingHP <= 0) {
        break;
      }

      // if we went second...
      hitsEndured++;
      remainingHP -= maxDmg;

      // 'badly poisoned', gets worse each turn.
      // @TODO see if we've already calculated turns of toxicity
      // @TODO maybe track it in 'toxicity' or 'toxCounter' or something
      if (defender.conditions.indexOf('tox') >= 0) {
        statusDmg += defender.maxhp / 16; // @TODO does this exist
      }
      remainingHP -= statusDmg;
      // could be dead at this point! let's run the loop again though. all it
      // will do is deal more dmg if isFirst is true.
    }

    // do we have status effects that make this worse?

    // paralysis penalty: moves fail 25% of the time
    if (attacker.conditions.indexOf('par') >= 0) {
      hitsEndured *= 1.25;
    }
    // frozen penalty: gonna cost you some turns.
    // this will be slightly wrong for mons who have been frozen for some
    // turns already.
    // 0 turns: .20
    // 1 turn: .16     (0-1 turns: .36)
    // 2 turns: .128   (0-2 turns: .488)
    // 3 turns: .1024  (0-3 turns: .5904)
    if (attacker.conditions.indexOf('frz') >= 0) {
      hitsEndured += 2.1;
    }

    if (attacker.conditions.indexOf('slp') >= 0) {
      hitsEndured += 2;
    }

    if (attacker.volatileStatuses && attacker.volatileStatuses.indexOf('confusion') >= 0) { // @TODO this doesn't exist
      hitsEndured += 2;
    }

    return hitsEndured;
  }
}

export default new Fitness();
