import fs from 'fs';
import LAFitness from 'la-fitness';
import Log from 'leftovers-again/lib/log';

// @TODO
const stateLoader = (filename) => {
  try {
    const stuff = fs.readFileSync(filename, 'utf8');
    return JSON.parse(stuff);
  } catch (e) {
    console.error('Couldnt load the test state.');
    console.error(e);
  }
};

let bot;

xdescribe('_integration', () => {
  beforeEach( () => {
    bot = new LAFitness();
    spyOn(Log, 'toFile');
  });
  // it('missing base stats', () => {
  //   const {state} = stateLoader('log/23:43:37-7');
  //   const decision = bot.decide(state);
  //   console.log(decision);
  // });
  // it('missing base stats (atk)', () => {
  //   const {state} = stateLoader('./log/15-01-07.err');
  //   const decision = bot.decide(state);
  //   console.log(decision);
  // });
  // it('cannot read hp', () => {
  //   const {state} = stateLoader('log/13-59-39.20');
  //   const decision = bot.decide(state);
  //   console.log(decision);
  // });
  it('cannot map', () => {
    const {state} = stateLoader('./log/14-22-34.err');
    const decision = bot.decide(state);
    console.log(decision);
  });
  it('defender has null hp', () => {
    const {state} = stateLoader('./log/14-57-22.err');
    const decision = bot.decide(state);
    console.log(decision);
  });
});
