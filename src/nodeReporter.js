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
    if (!node.myChoice) return '';
    const mine = node.myChoice ? node.myChoice.id : '??';
    const yours = node.yourChoice ? node.yourChoice.id : '??';
    // console.log(JSON.stringify(node));
    return `me: ${mine}, you: ${yours}, fitness: ${node.fitness}, depth: ${node.depth}
    (my hp: ${node.state.self.active.hp} vs your hp: ${node.state.opponent.active.hp})`;
  }

  reportCondensed(node) {
    const lines = [];
    lines.push(`fitness: ${Math.round(node.fitness, 2)}`);
    lines.push(`moves chosen: ${this.recursiveMoves(node)}`);
    lines.push(`(my dudes hp: ${node.state.self.active.species} ${node.state.self.active.hp
    } vs your hp: ${node.state.opponent.active.species} ${node.state.opponent.active.hp})`);
    return lines.join('\n');
  }


  recursiveMoves(node) {
    const mine = node.myChoice ? node.myChoice.id : '??';
    if (node.prevNode && node.prevNode.myChoice) {
      return this.recursiveMoves(node.prevNode) + ',' + mine;
    }
    return mine;
  }
}

export default new NodeReporter();
