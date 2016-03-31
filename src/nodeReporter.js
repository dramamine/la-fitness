class NodeReporter {
  report(node) {
    // console.log('trying to report on this node:', node);
    const thisOccurrence = this._getNodeString(node);
    if (node.prevNode) {
      return this.report(node.prevNode) + '\n' + thisOccurrence;
    }
    return thisOccurrence;
  }

  _getNodeString(node) {
    const mine = node.myChoice ? node.myChoice.id || node.myChoice.species : '??';
    const yours = node.yourChoice ? node.yourChoice.id || node.yourChoice.species : '??';
    return `me: ${mine}, you: ${yours}, fitness: ${node.fitness}`;
  }
}

export default new NodeReporter();
