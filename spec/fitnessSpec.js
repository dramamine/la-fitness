import fitness from 'la-fitness/src/fitness';
import Util from 'pokeutil';

describe('Fitness', () => {
  describe('_getMaxDmg', () => {
    it('should research a pokemon if we don\'t know its moves', () => {
      const attacker = Util.researchPokemonById('hitmonchan');
      const defender = Util.researchPokemonById('eevee');
      const {bestMove} = fitness._getMaxDmg(attacker, defender);
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
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 100, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(true);
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(0);
    });
    it('should calculate 1 for a slow OHKO move', () => {
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 100, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(false);
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(1);
    });
    it('should calculate 1 for a fast 2HKO move', () => {
      console.log('FAST 2HKO MOVE');
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(true);
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(1);
    });
    it('should calculate 2 for a slow-speed 2HKO move', () => {
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(false);
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(2);
    });
    it('should add 2.1 turns for a frozen attacker', () => {
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(false);
      attacker.conditions = 'frz';
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(4.1);
    });
    it('should add 2 turns for a sleepy attacker', () => {
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(false);
      attacker.conditions = 'slp';
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(4);
    });
    it('should add 25% of turns for a paralyzed attacker', () => {
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 50, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(false);
      attacker.conditions = 'par';
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(2.5);
    });
    it('should handle regular poison, 1/8 dmg per turn', () => {
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 12.5, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(false);
      defender.conditions = 'psn';
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(4);
    });
    it('should handle a burn, 1/8 dmg per turn', () => {
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 12.5, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(false);
      defender.conditions = 'brn';
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(4);
    });
    it('should handle bad poison, kills in 6 turns', () => {
      spyOn(fitness, '_getMaxDmg').and.returnValue({maxDmg: 0, bestMove: move});
      spyOn(fitness, '_probablyGoesFirst').and.returnValue(false);
      defender.conditions = 'tox';
      expect(fitness._getHitsEndured(attacker, defender)).toEqual(6);
    });
  });
});
