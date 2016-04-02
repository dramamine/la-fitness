import util from 'pokeutil';
import TurnSimulator from 'la-fitness/src/turnsimulator';
import Damage from 'lib/damage';

describe('turn simulator', () => {
  // describe('_arrayReducer', () => {
  //   it('should turn objects and arrays of objects into an array of objects', () => {
  //     const attacker = util.researchPokemonById('eevee');
  //     const defender = util.researchPokemonById('meowth');
  //     const possible = [
  //       [
  //         {
  //           attacker,
  //           defender,
  //           chance: 0.125
  //         },
  //         {
  //           attacker,
  //           defender,
  //           chance: 0.125
  //         },
  //       ],
  //       {
  //         attacker,
  //         defender,
  //         chance: 0.5
  //       },
  //       [
  //         {
  //           attacker,
  //           defender,
  //           chance: 0.125
  //         },
  //         {
  //           attacker,
  //           defender,
  //           chance: 0.125
  //         },
  //       ],
  //     ];
  //     const reduced = possible.reduce(TurnSimulator._arrayReducer, []);
  //     expect(reduced.length).toBe(5);
  //   });
  // });
  describe('_applySecondaries', () => {
    it('should handle a self-boosting move', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'self',
        boosts: {atk: 2}
      };
      const res = TurnSimulator._applySecondaries(possible, possible.attacker.move);
      expect(res[0].attacker.boosts.atk).toEqual(2);
    });

    it('should handle a stat lowering move', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'normal',
        boosts: {atk: -2}
      };
      const res = TurnSimulator._applySecondaries(possible, possible.attacker.move);
      expect(res[0].defender.boosts.atk).toEqual(-2);
    });

    it('should handle a self-boosting volatile status', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'self',
        volatileStatus: 'awesome'
      };
      const res = TurnSimulator._applySecondaries(possible, possible.attacker.move);
      expect(res[0].attacker.volatileStatus).toBe('awesome');
    });

    it('should handle a volatile status move', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'normal',
        volatileStatus: 'paralysis'
      };
      const res = TurnSimulator._applySecondaries(possible, possible.attacker.move);
      expect(res[0].defender.volatileStatus).toBe('paralysis');
    });

    it('should apply possible effects', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'normal',
        secondary: {
          volatileStatus: 'paralysis',
          chance: 50
        }
      };

      const [noproc, procs] = TurnSimulator._applySecondaries(possible, possible.attacker.move);

      expect(noproc.defender.volatileStatus).toBeUndefined();
      expect(noproc.chance).toBe(0.5);

      expect(procs.defender.volatileStatus).toBe('paralysis');
      expect(procs.chance).toBe(0.5);
    });

    it('should apply status effects', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'status',
        status: 'tox'
      };

      const [res] = TurnSimulator._applySecondaries(possible, possible.attacker.move);

      expect(res.defender.statuses).toEqual(['tox']);
      expect(res.chance).toBe(1);
    });

    it('should apply possible boosts', () => {
      const possible = {
        attacker: {},
        defender: {},
        chance: 1
      };
      possible.attacker.move = {
        target: 'normal',
        secondary: {
          boosts: {atk: -1},
          chance: 30
        }
      };

      const [noproc, procs] = TurnSimulator._applySecondaries(possible, possible.attacker.move);

      expect(noproc.defender.boosts).toBeUndefined();
      expect(noproc.chance).toBe(0.7);

      expect(procs.defender.boosts.atk).toBe(-1);
      expect(procs.chance).toBe(0.3);
    });
  });
  // describe('_normalize', () => {
  //   it('should give equal chance to all things', () => {
  //     const stuff = [{}, {}, {}, {}];
  //     TurnSimulator._normalize(stuff);
  //     expect(stuff[0].chance).toEqual(0.25);
  //     expect(stuff[1].chance).toEqual(0.25);
  //     expect(stuff[2].chance).toEqual(0.25);
  //     expect(stuff[3].chance).toEqual(0.25);
  //   });
  //   it('should subtract an existing chance', () => {
  //     const stuff = [{chance: 0.4}, {}, {}];
  //     TurnSimulator._normalize(stuff);
  //     expect(stuff[0].chance).toEqual(0.4);
  //     expect(stuff[1].chance).toEqual(0.3);
  //     expect(stuff[2].chance).toEqual(0.3);
  //   });
  // });
  describe('_simulateMove', () => {
    let attacker;
    let defender;
    beforeEach( () => {
      attacker = util.researchPokemonById('eevee');
      defender = util.researchPokemonById('meowth');
    });
    it('should handle boring damage', () => {
      attacker.move = util.researchMoveById('dragonrage');
      const assumptions = {
        level: 50,
        hp: 100,
        maxhp: 100
      };
      Object.assign(attacker, assumptions);
      Object.assign(defender, assumptions);
      const res = TurnSimulator._simulateMove({
        attacker,
        defender
      });
      // min dmg
      expect(res[0].defender.hp).toEqual(60);
      // max dmg
      expect(res[1].defender.hp).toEqual(60);
    });
    it('should handle likely death', () => {
      attacker.move = util.researchMoveById('dragonrage');
      const assumptions = {
        level: 50,
        hp: 40,
        maxhp: 100
      };
      Object.assign(attacker, assumptions);
      Object.assign(defender, assumptions);
      const res = TurnSimulator._simulateMove({
        attacker,
        defender
      });
      // min dmg
      expect(res[0].defender.hp).toEqual(0);
    });
    it('should handle possible death', () => {
      attacker.move = util.researchMoveById('waterpulse');
      const assumptions = {
        level: 50,
        hp: 100,
        maxhp: 100
      };
      Object.assign(attacker, assumptions);
      Object.assign(defender, assumptions);
      const possibilities = TurnSimulator._simulateMove({
        attacker,
        defender
      });
      // two distinct HPs.
      const hps = new Set();
      possibilities.forEach(res => hps.add(res.defender.hp));
      expect(hps.size).toEqual(2);
    });
  });
  describe('simulate', () => {
    let state;
    beforeEach( () => {
      const mine = Object.assign({
        hp: 78,
        maxhp: 100
      }, util.researchPokemonById('eevee'));
      const yours = Object.assign({
        hp: 91,
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
    it('should produce results', () => {
      spyOn(Damage, 'goesFirst').and.returnValue(false);
      const myMove = util.researchMoveById('dragonrage');
      const yourMove = util.researchMoveById('dragonrage');
      const res = TurnSimulator.simulate(state, myMove, yourMove);
      // all these possibilities are equal and have a 25% chance. there are
      // four possibilities bc each move does either low or high damage, but
      // with this move, it's simpler bc the move always does 40 damage.
      expect(res.length).toEqual(4);
      expect(res[0].chance).toEqual(0.25);
      expect(res[3].chance).toEqual(0.25);
      expect(res[0].state.self.active.hp).toEqual(38);
      expect(res[3].state.self.active.hp).toEqual(38);
      expect(res[0].state.opponent.active.hp).toEqual(51);
      expect(res[3].state.opponent.active.hp).toEqual(51);

      expect(res[0].state.self.active.species).toEqual('Eevee');
      expect(res[0].state.opponent.active.species).toEqual('Meowth');
      expect(res[3].state.self.active.species).toEqual('Eevee');
      expect(res[3].state.opponent.active.species).toEqual('Meowth');
    });
    it('should not swap mine and yours', () => {
      spyOn(Damage, 'goesFirst').and.returnValue(true);
      const myMove = util.researchMoveById('dragonrage');
      const yourMove = util.researchMoveById('dragonrage');
      const res = TurnSimulator.simulate(state, myMove, yourMove);
      expect(res.length).toEqual(4);
      expect(res[0].state.self.active.species).toEqual('Eevee');
      expect(res[0].state.self.active.hp).toEqual(38);
      expect(res[0].state.opponent.active.species).toEqual('Meowth');
      expect(res[0].state.opponent.active.hp).toEqual(51);
      expect(res[3].state.self.active.species).toEqual('Eevee');
      expect(res[3].state.self.active.hp).toEqual(38);
      expect(res[3].state.opponent.active.species).toEqual('Meowth');
      expect(res[3].state.opponent.active.hp).toEqual(51);
    });
    it('should handle me switching out', () => {
      console.log('HEAR ME OUT>> ');
      console.log(state);
      const myMove = util.researchPokemonById('mew');
      myMove.hp = 100;
      myMove.maxhp = 100;
      myMove.hppct = 100;
      const yourMove = util.researchMoveById('dragonrage');
      const res = TurnSimulator.simulate(state, myMove, yourMove);
      expect(res[0].state.self.active.species).toEqual('Mew');
      expect(res[0].state.self.active.hp).toEqual(60);
      expect(res[0].state.opponent.active.species).toEqual('Meowth');
      expect(res[0].state.opponent.active.hp).toEqual(91);
    });
    it('should handle you switching out', () => {
      const myMove = util.researchMoveById('dragonrage');
      const yourMove = util.researchPokemonById('mewtwo');
      yourMove.hp = 100;
      yourMove.maxhp = 100;
      yourMove.hppct = 100;
      const res = TurnSimulator.simulate(state, myMove, yourMove);
      expect(res[0].state.self.active.species).toEqual('Eevee');
      expect(res[0].state.self.active.hp).toEqual(78);
      expect(res[0].state.opponent.active.species).toEqual('Mewtwo');
      expect(res[0].state.opponent.active.hp).toEqual(60);
    });
    it('should handle us switching out', () => {
      const myMove = util.researchPokemonById('klefki');
      const yourMove = util.researchPokemonById('charmander');
      const res = TurnSimulator.simulate(state, myMove, yourMove);
      expect(res[0].state.self.active.species).toEqual('Klefki');
      expect(res[0].state.opponent.active.species).toEqual('Charmander');
    });
    it('should handle fakeout', () => {
      // fakeout goes first
      // opponent always flinches.
      // expect opponent to take damage and I'm scott-free.
      spyOn(Damage, 'goesFirst').and.returnValue(true);
      const myMove = util.researchMoveById('fakeout');
      const yourMove = util.researchMoveById('surf');
      const res = TurnSimulator.simulate(state, myMove, yourMove);
      expect(res[0].state.self.active.hp).toEqual(78);
      expect(res[0].state.opponent.active.hp).toBeLessThan(91);
    });
  });
  describe('evaluateNode', () => {
    let state;
    let yourOptions;
    beforeEach( () => {
      state = {
        self: {
          active: Object.assign({
            hp: 100,
            maxhp: 100,
            boostedStats: {
              spe: 105
            },
          }, util.researchPokemonById('onix'))
        },
        opponent: {
          active: Object.assign({
            hp: 100,
            maxhp: 100,
            boostedStats: {
              spe: 95
            },
          }, util.researchPokemonById('bulbasaur'))
        },
        field: 'dont lose this'
      };
      yourOptions = [
        util.researchMoveById('waterpulse'),
        util.researchMoveById('swordsdance'),
        util.researchMoveById('toxic'),
      ];
    });
    it('should notice the worst situation kills us', () => {
      // onix is 4x weak to water.
      const myMove = util.researchMoveById('splash');
      const res = TurnSimulator.evaluateNode(state, myMove, yourOptions);
      console.log(res);
      expect(res.fitness).toBeLessThan(-5);
      expect(res.state.self.active.dead).toBe(true);
      expect(res.state.self.active.hp).toEqual(0);
      expect(res.state.field).toBeTruthy();
    });
  });

  describe('iterate', () => {
    let state;
    let myOptions;
    let yourOptions;
    beforeEach( () => {
      state = {
        self: {
          active: Object.assign({
            hp: 100,
            maxhp: 100,
            boostedStats: {
              spe: 95
            },
          }, util.researchPokemonById('eevee'))
        },
        opponent: {
          active: Object.assign({
            hp: 100,
            maxhp: 100,
            boostedStats: {
              spe: 105
            },
          }, util.researchPokemonById('meowth'))
        },
      };
      myOptions = [
        util.researchMoveById('waterpulse'),
        util.researchMoveById('swordsdance'),
        util.researchMoveById('toxic'),
      ];
      yourOptions = [
        util.researchMoveById('waterpulse'),
        util.researchMoveById('swordsdance'),
        util.researchMoveById('toxic'),
      ];
    });
    it('should produce some possibilities', () => {
      const futures = TurnSimulator.iterate(state, myOptions, yourOptions);
      expect(futures.length).toEqual(4);
      // const total = futures.reduce( (prev, future) => {
      //   return prev + future.chance;
      // }, 0);
      // // 3 move
      // expect(total).toBeCloseTo(3, 0);

      // const doubleswords = futures.filter(({attacker, defender}) => {
      //   return attacker.boosts && attacker.boosts.atk === 2 &&
      //     defender.boosts && defender.boosts.atk === 2;
      // });
      // expect(doubleswords.length).toBe(4);
    });
    xit('should handle possible volatile statuses', () => {
      yourOptions = [
        util.researchMoveById('waterpulse')
      ];
      const futures = TurnSimulator.iterate(state, myOptions, yourOptions);
      const waterpulses = futures.filter( (possibility) => {
        return possibility.defender.move.id === 'waterpulse';
      });
      expect(waterpulses.length).toBeGreaterThan(0);
      let noproc = 0;
      let yesproc = 0;
      waterpulses.forEach(waterpulse => {
        // console.log('checkin out vstatus:', waterpulse.attacker.move.id,
        //   waterpulse.attacker.volatileStatus, waterpulse.chance,
        //   waterpulse.attacker.boosts, waterpulse.defender.hp);
        if (waterpulse.attacker.volatileStatus === 'confusion') {
          yesproc += waterpulse.chance;
        } else {
          noproc += waterpulse.chance;
        }
      });
      // console.log('procs:', yesproc, noproc);
      // note that yesproc and noproc add up to 3, because we are making 3
      // different choices, and the 'chance' amounts are all based on which
      // choice we made.
      expect(yesproc * 4).toEqual(noproc);
    });
  });
  describe('getNextNode', () => {
    const someNodes = [
      {evaluated: false, fitness: 0, depth: 1},
      {evaluated: false, fitness: 1, depth: 1},
      {evaluated: false, fitness: -1, depth: 1},
      {evaluated: true, fitness: 0, depth: 1},
      {evaluated: false, fitness: 0, depth: 0}
    ];
    it('should return the node with the best fitness', () => {
      const chosen = TurnSimulator.getNextNode(someNodes);
      console.log('this was chosen:', chosen);
      expect(chosen.fitness).toEqual(1);
    });
    it('should not consider nodes that have been evaluated', () => {
      const chosen = TurnSimulator.getNextNode([someNodes[3]]);
      expect(chosen).toEqual(null);
    });
    it('should not consider nodes that are too deep', () => {
      const chosen = TurnSimulator.getNextNode([someNodes[4]]);
      expect(chosen).toEqual(null);
    });
  });
// story time:
// I am slightly faster than my opponent.
// my best strategy is to cast swords dance, then water pulse. this will kill
// the opponent and leave me sitting with +2 attack, and only endure one
// attack from my opponent.
// after one turn casting swords dance, I should notice that my endurance is
// 0.
// my opponent has toxic with Prankster, so he should cast some non-lethal
// attack move the first turn and cast Prankster the second turn.
// (this will require foresight for 2 turns, understanding of Prankster, and
// understanding the value of status moves.)
  xdescribe('compare', () => {
    let state;
    let myOptions;
    let yourOptions;
    beforeEach( () => {
      state = {
        self: {
          active: Object.assign({
            hp: 100,
            maxhp: 100,
            boostedStats: {
              spe: 105
            },
          }, util.researchPokemonById('eevee'))
        },
        opponent: {
          active: Object.assign({
            hp: 100,
            maxhp: 100,
            boostedStats: {
              spe: 95
            },
          }, util.researchPokemonById('meowth'))
        },
      };
      myOptions = [
        util.researchMoveById('waterpulse'),
        util.researchMoveById('swordsdance'),
        util.researchMoveById('toxic'),
      ];
      yourOptions = [
        util.researchMoveById('swordsdance'),
      ];
    });
    xit('should produce some possibilities', () => {
      const futures = TurnSimulator.iterate(state, myOptions, yourOptions);
      const comparison = TurnSimulator.compare(futures);
      console.log(comparison);
    });
  });
});
