import TurnSimulator from 'la-fitness/src/turnsimulator';
import Evaluator from 'la-fitness/src/evaluator';
import state from 'helpers/randomstate';

xdescribe('evaluator', () => {
  describe('evaluate', () => {
    it('should format my options the way I want', () => {
      spyOn(TurnSimulator, 'iterate');
      Evaluator.evaluate(state);
      const options = TurnSimulator.iterate.calls.argsFor(0)[1];
      expect(options[0].id).toBe('xscissor');
      expect(options[1].id).toBe('swordsdance');
      expect(options[2].id).toBe('willowisp');
      expect(options[3].id).toBe('shadowclaw');
      expect(options[4].species).toBe('Armaldo');
      expect(options[5].species).toBe('Landorus');
      expect(options[6].species).toBe('Eelektross');
      expect(options[7].species).toBe('Seaking');
      expect(options[8].species).toBe('Starmie');
    });

    it('should evaluate a fitness for each option', () => {
      const futures = Evaluator.evaluate(state);
      console.log(futures[0]);
      // futures.forEach(future => {
      //   expect()
      // })
    });
  });


});
