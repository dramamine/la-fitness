import Log from 'log';
import Iterator from './iterator';
import {MOVE, SWITCH} from 'decisions';

export default class Main {
  decide(state) {
    const node = this.branchPicker(state);
    if (!node.myChoice) {
      Log.error('well, this is troubling. no myChoice in the node.');
      console.log(node);
    }
    if (node.myChoice.move) {
      return new MOVE(node.myChoice.id);
    } else if (node.myChoice.species) {
      console.log('Gonna switch into ' + node.myChoice.id);
      return new SWITCH(node.myChoice.id);
    }

    Log.error('couldnt read the result of my search.');
    console.log(node);
  }

  branchPicker(state) {
    const futures = Iterator.iterateSingleThreaded(state, 1)
    .filter(a => a.myChoice) // root node has no choice made
    .sort((a, b) => b.fitness - a.fitness); // highest fitness first
    const future = futures[0];
    // to reach this future, we must reach through the past, and find the
    // choice we originally made to get us here.

    // console.log(JSON.stringify(futures));
    // console.log('(all evaluated nodes in sorted order)');

    let node = future;
    while (node.prevNode && node.prevNode.prevNode) {
      node = node.prevNode;
    }
    return node;
  }
}
