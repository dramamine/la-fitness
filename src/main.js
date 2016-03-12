import Fitness from './fitness';

export default class Main {

  decide(state) {
    console.log( Fitness.evaluateFitness(state) );
  }
}
