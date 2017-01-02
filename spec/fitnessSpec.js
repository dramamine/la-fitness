import Fitness from 'fitness';
import util from 'leftovers-again/lib/pokeutil';

describe('Fitness', () => {
  describe('_getMaxDmg', () => {
    it('should research a pokemon if we don\'t know its moves', () => {
      const attacker = util.researchPokemonById('hitmonchan');
      const defender = util.researchPokemonById('eevee');
      const {bestMove} = Fitness._getMaxDmg(attacker, defender);
      // STAB move with 75 base power. its best.
      expect(bestMove.id).toEqual('drainpunch');
    });
  });
  describe('_getHitsEndured', () => {
    let attacker;
    let defender;
    let move;

    const baseAttacker = {
      hp: 100,
      maxhp: 100,
      statuses: '',
      volatileStatuses: '',
      species: 'eevee'
    };

    const baseDefender = {
      hp: 100,
      maxhp: 100,
      statuses: '',
      volatileStatuses: '',
      species: 'eevee'
    };

    const baseMove = {
      id: 'punch',
      priority: 0
    };

    beforeEach( () => {
      attacker = Object.assign({}, baseAttacker);
      defender = Object.assign({}, baseDefender);
      move = Object.assign({}, baseMove);
    });
    it('should calculate no hits for a fast OHKO move', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 100, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(true);
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(0);
    });
    it('should calculate 1 for a slow OHKO move', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 100, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(false);
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(1);
    });
    it('should calculate 1 for a fast 2HKO move', () => {
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(true);
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(1);
    });
    it('should calculate 2 for a slow-speed 2HKO move', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(false);
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(2);
    });
    it('should add 2.1 turns for a frozen attacker', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(false);
      attacker.conditions = 'frz';
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(4.1);
    });
    it('should add 2 turns for a sleepy attacker', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(false);
      attacker.conditions = 'slp';
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(4);
    });
    it('should add 25% of turns for a paralyzed attacker', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(false);
      attacker.conditions = 'par';
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(2.5);
    });
    it('should handle regular poison, 1/8 dmg per turn', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 12.5, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(false);
      defender.conditions = 'psn';
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(4);
    });
    it('should handle a burn, 1/8 dmg per turn', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 12.5, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(false);
      defender.conditions = 'brn';
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(4);
    });
    it('should handle bad poison, kills in 6 turns', () => {
      spyOn(Fitness, '_getMaxDmg').and.returnValue({maxDmg: 0, bestMove: move});
      spyOn(Fitness, '_probablyGoesFirst').and.returnValue(false);
      defender.conditions = 'tox';
      expect(Fitness._getHitsEndured(attacker, defender)).toEqual(6);
    });

    it('should handle dragonrage', () => {
      const myActive = Object.assign({
        hppct: 90,
        hp: 90,
        maxhp: 100,
        moves: [
          util.researchMoveById('quickattack')
        ],
        active: true
      }, util.researchPokemonById('eevee'));
      const yourActive = Object.assign({
        active: true,
        hp: 100,
        maxhp: 100,
        hppct: 100,
        moves: [
          util.researchMoveById('dragonrage')
        ]
      }, util.researchPokemonById('steelix'));
      // was really just playing around with this to see what worked. steelix
      // is steel-type so he resists the normal move quickattack
      const atk = Fitness._getHitsEndured(myActive, yourActive);
      expect(atk).toBeGreaterThan(1);
      expect(atk).toBeLessThan(10);

      // absorbs three quick attacks before dealing final blow
      const def = Fitness._getHitsEndured(yourActive, myActive);
      expect(def).toEqual(3);
    });
  });
  describe('partyFitness', () => {
    it('should sum up the hp percents', () => {
      const party = [{hppct: 50}, {hppct: 75}];
      expect(Fitness.partyFitness(party)).toEqual(125);
    });
    it('should punish spikes', () => {
      const party = [{hppct: 50}, {hppct: 75}];
      expect(Fitness.partyFitness(party, {spikes: 1})).toBeLessThan(125);
    });
  });
  describe('rate', () => {
    let myActive;
    let yourActive;
    let state;
    beforeEach(() => {
      myActive = Object.assign({
        hppct: 50,
        hp: 50,
        maxhp: 100,
        moves: [
          util.researchMoveById('roost'),
          util.researchMoveById('quickattack')
        ]
      }, util.researchPokemonById('eevee'));
      yourActive = Object.assign({
        hppct: 50,
        hp: 50,
        maxhp: 100,
        moves: [
          util.researchMoveById('roost'),
          util.researchMoveById('quickattack')
        ]
      }, util.researchPokemonById('eevee'));
      state = {
        self: {
          active: myActive,
          reserve: [myActive]
        },
        opponent: {
          active: yourActive,
          reserve: [yourActive]
        }
      };
    });
    it('should know a state is better if I have more health', () => {
      const orig = Fitness.rate(state);

      state.self.active.hppct = 51;
      const updated = Fitness.rate(state);
      expect(updated.value).toBeGreaterThan(orig.value);
      expect(updated.myHealth).toBeGreaterThan(orig.myHealth);
    });
    it('should know a state is better if the opponent has less health', () => {
      const orig = Fitness.rate(state);

      state.opponent.active.hppct = 49;
      const updated = Fitness.rate(state);
      expect(updated.value).toBeGreaterThan(orig.value);
      expect(updated.yourHealth).toBeLessThan(orig.yourHealth);
    });

    it('should know a state is worse if it has more dead mons', () => {
      const pikachu = {
        species: 'pikachu',
        dead: true
      };
      state.self.reserve.push(pikachu);
      const orig = Fitness.rate(state);

      pikachu.dead = false;
      pikachu.hppct = 100;

      const updated = Fitness.rate(state);
      expect(updated.value).toBeGreaterThan(orig.value);
      expect(updated.myHealth).toBeGreaterThan(orig.myHealth);
    });
    it('should favor shorter paths (higher depth) to the state', () => {
      const orig = Fitness.rate(state, 1);
      const updated = Fitness.rate(state, 2);
      expect(updated.value).toBeGreaterThan(orig.value);
      expect(updated.depth).toBeGreaterThan(orig.depth);
    });
    it('should favor state where I take fewer turns to kill opponent', () => {
      spyOn(Fitness, '_getHitsEndured').and.returnValues(5, 5);
      const orig = Fitness.rate(state);
      Fitness._getHitsEndured.and.returnValues(4, 5);
      const updated = Fitness.rate(state);
      expect(updated.value).toBeGreaterThan(orig.value);
      expect(updated.endurance).toBeLessThan(orig.endurance);
      expect(updated.block).toEqual(orig.block);
    });
    it('should favor state where opponent needs more turns to kill me', () => {
      spyOn(Fitness, '_getHitsEndured').and.returnValues(5, 5);
      const orig = Fitness.rate(state);
      Fitness._getHitsEndured.and.returnValues(5, 6);
      const updated = Fitness.rate(state);
      expect(updated.value).toBeGreaterThan(orig.value);
      expect(updated.endurance).toEqual(orig.endurance);
      expect(updated.block).toBeGreaterThan(orig.block);
    });
    it('should favor a situation where I kill someone but am harmed badly', () => {
      state.self.active.hppct = 100;
      const orig = Fitness.rate(state);

      state.self.active.hppct = 5;
      state.opponent.active.dead = true;
      const updated = Fitness.rate(state);
      expect(updated.value).toBeGreaterThan(orig.value);
    });
    it('should be indifferent if we do equal damage to each other', () => {
      const orig = Fitness.rate(state);

      state.self.active.hppct = 5;
      state.opponent.active.hppct = 5;
      const updated = Fitness.rate(state);
      expect(updated.value).toEqual(orig.value);
    });
  });

  describe('summarize', () => {
    it('should produce some valid data', () => {
      const possibilities = [
        {
          state: {
            self: {
              active: {}
            },
            opponent: {
              active: {}
            }
          },
          fitness: {
            endurance: 3,
            block: 0,
            value: 1
          },
          chance: 0.15
        },
        {
          state: {
            self: {
              active: {}
            },
            opponent: {
              active: {}
            }
          },
          fitness: {
            endurance: 0,
            block: 3,
            value: 2
          },
          chance: 0.2
        },
        {
          state: {
            self: {
              active: { dead: true }
            },
            opponent: {
              active: {}
            }
          },
          fitness: {
            endurance: 3,
            block: 0,
            value: 3
          },
          chance: 0.25
        },
        {
          state: {
            self: {
              active: {}
            },
            opponent: {
              active: { dead: true }
            }
          },
          fitness: {
            endurance: 0,
            block: 3,
            value: 4
          },
          chance: 0.4
        }
      ];
      const summary = Fitness.summarize(possibilities);
      expect(summary.definiteWin).toBeCloseTo(0.4, 5);
      expect(summary.definiteLoss).toBeCloseTo(0.25, 5);
      expect(summary.likelyWin).toBeCloseTo(0.6, 5);
      expect(summary.likelyLoss).toBeCloseTo(0.4, 5);
      expect(summary.expectedValue).toBeGreaterThan(1);
      expect(summary.expectedValue).toBeLessThan(4);
    });
  });
});
