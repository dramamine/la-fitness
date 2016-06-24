import Log from 'leftovers-again/lib/log';
import Iterator from './iterator';
import NodeReporter from './nodeReporter';
import {MOVE, SWITCH} from 'leftovers-again/lib/decisions';
// import Team from 'lib/team';

const multithreaded = false;

if (multithreaded) {
  Iterator.prepare();
}

export default class Main {
  decide(state) {
    // won't happen for randombattles, but lazily handle for anythinggoes
    if (state.teamPreview) {
      return new SWITCH(0);
    }

    if (!multithreaded) {

      // single-threaded
      let choice = null;
      try {
        choice = this.trunkPicker(state);
      } catch(e) {
        console.error(e);
        this.blog(state, null);
      }

      if (!choice) {
        Log.error('well, this is troubling. no choice in the trunkpicker result.');
        return null;
      }
      if (choice.move) {
        return new MOVE(choice.id);
      } else if (choice.species) {
        return new SWITCH(choice.id);
      }
    }

    // multithreaded code
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

  // team() {
  //   console.log('OK, my team function was called.');
  //   // if this gets called use a predetermined random team.
  //   return Team.random();
  // }

  /**
   * Single-threaded result picker.
   *
   * @param  {[type]} state The game state
   * @return {Decision}       The choice.
   */
  trunkPicker(state) {
    // get the results
    let futures = Iterator.iterateSingleThreaded(state, 1);
    this.blog(state, futures);

    // arrange our array best->worst
    futures = futures.filter(node => node.myChoice && node.terminated)
    .sort((a, b) => b.fitness - a.fitness); // highest fitness first

    let node = futures[0];
    if (!node) {
      Log.error('no node in the future array.');
      return null;
    }

    // get the original node (i.e. root is the last turn, follow prevNode to
    // the first)
    while (node.prevNode && node.prevNode.prevNode) {
      node = node.prevNode;
    }

    if (!node.myChoice) {
      Log.error('node didnt have a choice set.');
      return null;
    }
    return node.myChoice;
  }

  branchPicker(state) {
    return new Promise((resolve) => {
      Iterator.iterateMultiThreaded(state, 2).then((nodes) => {
        // root node has no choice made. not sure I need this check though.
        const futures = nodes.filter(node => node.myChoice && node.terminated)
        .sort((a, b) => b.fitness - a.fitness); // highest fitness first

        this.blog(state, futures);

        let node = future;
        while (node.prevNode && node.prevNode.prevNode) {
          node = node.prevNode;
        }

        resolve(node);
      });
    });
  }

  /**
   * Write about your choices.
   *
   * @param  {[type]} state [description]
   * @param  {[type]} nodes [description]
   * @return {[type]}       [description]
   */
  blog(state, nodes) {
    if (!nodes || nodes.length <= 1) {
      // console.error('Nodes was too short to blog about.');

      const contents = {state};
      const filename = new Date().toTimeString().slice(0, 8).replace(/:/g, '-') + '.err';
      if (Log.toFile(filename, JSON.stringify(contents)) ) {
        Log.log(`Wrote state only (no decision nodes) to file: ./log/${filename}`);
      }
      return;
    }
    NodeReporter.intermediateReporter(nodes);

    const summarize = (n) => {
      return {
        plan: NodeReporter.recursiveMoves(n),
        fitness: n.fitness
      };
    };

    // log permanently
    const filename = new Date().toTimeString().slice(0, 8).replace(/:/g, '-') + '.' + state.rqid;
    const summary = {
      first: summarize(nodes[0]),
      second: summarize(nodes[1])
    };
    const contents = { summary, state, first: nodes[0], second: nodes[1] || null };

    // if we log successfully, say so. otherwise, maybe we are unit testing?
    if (Log.toFile(filename, JSON.stringify(contents)) ) {
      Log.log(`Wrote state and stuff to file: ./log/${filename}`);
    }
  }
}
