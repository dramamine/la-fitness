import Log from 'log';
import Iterator from './iterator';
import NodeReporter from './nodeReporter';
import {MOVE, SWITCH} from 'decisions';

Iterator.prepare();

export default class Main {
  decide(state) {
    return new Promise((resolve, reject) => {
      this.branchPicker(state).then((node) => {
        console.log('found my node.');
        if (!node.myChoice) {
          Log.error('well, this is troubling. no myChoice in the node.');
          console.log(node);
        }
        if (node.myChoice.move) {
          return resolve(new MOVE(node.myChoice.id));
        } else if (node.myChoice.species) {
          console.log('Gonna switch into ' + node.myChoice.id);
          return resolve(new SWITCH(node.myChoice.id));
        }

        Log.error('couldnt read the result of my search.');
        console.log(node);
        reject(node);
      });
    });
  }

  branchPicker(state) {
    return new Promise((resolve) => {
      Iterator.iterateMultiThreaded(state, 3).then((nodes) => {
        console.log('im back from iterating. ', nodes.length);
        // console.log(nodes);
        // root node has no choice made. not sure I need this check though.
        const futures = nodes.filter(node => node.myChoice && node.terminated)
        .sort((a, b) => b.fitness - a.fitness); // highest fitness first
        const future = futures[0];

        // console.log('best future?', future);
        // to reach this future, we must reach through the past, and find the
        // choice we originally made to get us here.

        // console.log(JSON.stringify(futures));
        // console.log('(all evaluated nodes in sorted order)');

        console.log(NodeReporter.report(future));

        let node = future;
        while (node.prevNode && node.prevNode.prevNode) {
          node = node.prevNode;
        }
        console.log(NodeReporter.report(node));
        resolve(node);
      });
    });
  }
}
