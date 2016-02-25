import Fitness from './fitness';

export default class Main {

  onRequest(state) {
    console.log( Fitness.evaluateFitness(state) );
  }
}
