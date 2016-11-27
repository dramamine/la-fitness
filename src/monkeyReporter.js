import Formats from 'leftovers-again/lib/data/formats';

class MonkeyReporter {
  constructor() {
    this.moves = [];
    this.switches = [];
    this.opponent = null;
  }
	use(state, node, best = true) {
    if (node.myChoice.move) {
      this.useMove(node);
    } else if (node.myChoice.species) {
      this.useSwitch(state, node);
    }

    this.useOpponent(state, node);
  }

  get() {
    return {
      moves: this.moves,
      switches: this.switches,
      opponent: this.opponent
    };
  }

  useMove(node) {
    const html = `
<p class="lgn fitness">
  ${this.formatDetails(node.fitnessDetails)}
</p>
<p class="lgn counter">
  ${node.yourChoice ? node.yourChoice.id : '??'}
</p>
`;
    this.moves.push({
      name: node.myChoice.name,
      id: node.myChoice.id,
      html
    });
  }

  useSwitch(state, node) {
    state.self.reserve.forEach((mon) => {
      let html = '';

      if (mon.species === node.myChoice.species) {
        html = `
<p class="lgn fitness">
${this.formatDetails(node.fitnessDetails)}
</p>
`;
      }

      this.switches.push({
        species: mon.species,
        html
      });
    });
  }

  useOpponent(state, node) {
    if (!state.opponent || !state.opponent.active) return;
    const moves = Formats[state.opponent.active.id].randomBattleMoves;
    const seenMoves = state.opponent.active.seenMoves;
    const html = moves.map((move) => {
      let moveText = move;
      if (seenMoves.indexOf(move) >= 0) {
        moveText = `<b>${moveText}</b>`;
      }
      if (move.indexOf(node.yourChoice.id) >= 0) {
        moveText = `<i>${moveText}</i>`;
      }
      return `<li>${moveText}</li>`;
    });
    this.opponent = {
      html: `<ul class="lgn opponent">${html.join('')}</ul>`
    };
  }

  formatDetails(deets) {
    return `
<p><span style="color: green;">${deets.endurance}</span>
 / <span style="color: red;">${deets.block}</span></p>
<p>Health: ${Math.round(deets.myHealth)} vs ${Math.round(deets.yourHealth)}</p>
<p>Total fitness: ${Math.round(deets.summary, 1)}</p>
`;
  }
}

export default MonkeyReporter;
