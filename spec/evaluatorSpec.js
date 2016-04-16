// import TurnSimulator from 'la-fitness/src/turnsimulator';
// import Evaluator from 'la-fitness/src/evaluator';
// import state from 'helpers/randomstate';

// describe('evaluator', () => {
//   describe('evaluate', () => {
//     it('should format my options the way I want', () => {
//       spyOn(TurnSimulator, 'iterate');
//       Evaluator.evaluate(state);
//       const options = TurnSimulator.iterate.calls.argsFor(0)[1];
//       expect(options[0].id).toBe('xscissor');
//       expect(options[1].id).toBe('swordsdance');
//       expect(options[2].id).toBe('willowisp');
//       expect(options[3].id).toBe('shadowclaw');
//       expect(options.find(option => option.species === 'Armaldo')).toBeTruthy();
//       expect(options.find(option => option.species === 'Landorus')).toBeTruthy();
//       expect(options.find(option => option.species === 'Eelektross')).toBeTruthy();
//       expect(options.find(option => option.species === 'Seaking')).toBeTruthy();
//       expect(options.find(option => option.species === 'Starmie')).toBeTruthy();
//     });
//     // it('should evaluate a fitness for each option', () => {
//     //   const futures = Evaluator.evaluate(state);
//     //   console.log(futures[0]);
//     //   // futures.forEach(future => {
//     //   //   expect()
//     //   // })
//     // });
//   });
// });
