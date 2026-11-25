/** Klondike solitaire. Click a card, then click where it should go. Drag works too. */

import { el } from '../core/util.js';

const SUITS = ['spade', 'heart', 'diamond', 'club'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const solitaireApp = {
  id: 'solitaire',
  name: 'Solitaire',
  blurb: 'Klondike on the desktop',
  category: 'games',
  width: 860,
  height: 640,
  minWidth: 640,
  launch(env) {
    let state = deal();
    let history = [];
    let selected = null;
    const root = el('div', { class: 'game sol' });
    const hud = el('div', { class: 'hud' });
    const moves = el('span', { text: 'Moves 0' });
    const undo = el('button', { class: 'btn btn-sm', type: 'button', text: 'Undo' });
    const drawBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Draw 1' });
    const again = el('button', { class: 'btn btn-sm', type: 'button', text: 'Redeal' });
    hud.append(moves, undo, drawBtn, again);
    const board = el('div', { class: 'sol-board' });
    root.append(hud, board);
    env.win.body.append(root);

    function pushHistory() {
      history.push(JSON.stringify(state));
      if (history.length > 80) history.shift();
    }
    function render() {
      moves.textContent = `Moves ${state.moves}`;
      drawBtn.textContent = state.draw === 1 ? 'Draw 1' : 'Draw 3';
      board.innerHTML = '';
      const top = el('div', { class: 'sol-top' });
      top.append(stockPile(), wastePile());
      const found = el('div', { class: 'sol-found' });
      state.foundations.forEach((pile, index) => found.append(foundationPile(pile, index)));
      top.append(found);
      const cols = el('div', { class: 'sol-cols' });
      state.columns.forEach((pile, index) => cols.append(columnPile(pile, index)));
      board.append(top, cols);
      if (state.foundations.reduce((sum, pile) => sum + pile.length, 0) === 52) {
        board.append(el('div', { class: 'game-note win', text: 'You cleared the tableau.' }));
        if (!state.celebrated) {
          state.celebrated = true;
          env.notify({ title: 'Solitaire', body: `Won in ${state.moves} moves.`, app: 'solitaire' });
        }
      }
    }
    function stockPile() {
      const pile = el('button', { class: 'pile', type: 'button', 'aria-label': 'Stock' });
      if (state.stock.length) pile.append(cardEl({ up: false }));
      else pile.append(el('span', { class: 'pile-empty', text: 'Recycle' }));
      pile.addEventListener('click', () => {
        pushHistory();
        drawFromStock(state);
        selected = null;
        render();
      });
      return pile;
    }
    function wastePile() {
      const pile = el('div', { class: 'pile waste' });
      const topCard = state.waste[state.waste.length - 1];
      if (topCard) {
        const node = cardEl(topCard, selected?.where === 'waste');
        node.addEventListener('click', (event) => {
          if (swallowClick(event)) return;
          choose({ where: 'waste' });
        });
        node.addEventListener('dblclick', () => autoFoundation({ where: 'waste' }));
        pile.append(node);
      }
      return pile;
    }
    function foundationPile(pileCards, index) {
      const pile = el('div', { class: 'pile foundation', 'data-drop': `found:${index}` });
      const topCard = pileCards[pileCards.length - 1];
      if (topCard) {
        const node = cardEl(topCard, selected?.where === 'found' && selected.index === index);
        node.addEventListener('click', (event) => {
          if (swallowClick(event)) return;
          choose({ where: 'found', index });
        });
        pile.append(node);
      } else pile.append(el('span', { class: 'pile-empty', text: 'A' }));
      pile.addEventListener('click', (event) => {
        if (event.target === pile || event.target.classList.contains('pile-empty')) choose({ where: 'found', index, empty: true });
      });
      return pile;
    }
    function columnPile(pileCards, index) {
      const pile = el('div', { class: 'sol-col', 'data-drop': `col:${index}` });
      if (!pileCards.length) pile.append(el('span', { class: 'pile-empty tall' }));
      pileCards.forEach((card, cardIndex) => {
        const node = cardEl(card, selected?.where === 'col' && selected.col === index && cardIndex >= selected.index);
        node.style.top = `${cardIndex * 22}px`;
        if (card.up) {
          node.addEventListener('click', (event) => {
            event.stopPropagation();
            if (swallowClick(event)) return;
            choose({ where: 'col', col: index, index: cardIndex });
          });
          node.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            autoFoundation({ where: 'col', col: index, index: cardIndex });
          });
          dragCard(node, { where: 'col', col: index, index: cardIndex });
        }
        pile.append(node);
      });
      pile.style.height = `${120 + Math.max(0, pileCards.length - 1) * 22}px`;
      pile.addEventListener('click', () => choose({ where: 'col', col: index, index: pileCards.length, empty: true }));
      return pile;
    }
    function choose(target) {
      if (!selected) {
        if (target.empty) return;
        if (!canSelect(state, target)) return;
        selected = target;
        render();
        return;
      }
      if (sameSelection(selected, target)) {
        selected = null;
        render();
        return;
      }
      pushHistory();
      const ok = moveSelection(state, selected, target);
      if (!ok) {
        history.pop();
        selected = target.empty || !canSelect(state, target) ? null : target;
      } else {
        state.moves += 1;
        selected = null;
      }
      render();
    }
    function autoFoundation(source) {
      if (!canSelect(state, source)) return;
      const cards = peek(state, source);
      if (cards.length !== 1) return;
      const index = state.foundations.findIndex((pile) => canFoundation(pile, cards[0]));
      if (index < 0) return;
      pushHistory();
      moveSelection(state, source, { where: 'found', index });
      state.moves += 1;
      selected = null;
      render();
    }
    function dragCard(node, source) {
      node.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const sx = event.clientX;
        const sy = event.clientY;
        let dragging = false;
        const move = (ev) => {
          if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) dragging = true;
        };
        const up = (ev) => {
          node.removeEventListener('pointermove', move);
          if (!dragging) return;
          node.dataset.dragged = '1';
          const zone = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]');
          if (!zone) return;
          const [kind, index] = zone.dataset.drop.split(':');
          const target = kind === 'col'
            ? { where: 'col', col: Number(index), index: state.columns[Number(index)].length, empty: true }
            : { where: 'found', index: Number(index), empty: true };
          selected = source;
          choose(target);
        };
        node.addEventListener('pointermove', move);
        node.addEventListener('pointerup', up, { once: true });
      });
    }
    undo.addEventListener('click', () => {
      const prev = history.pop();
      if (!prev) return;
      state = JSON.parse(prev);
      selected = null;
      render();
    });
    drawBtn.addEventListener('click', () => {
      state.draw = state.draw === 1 ? 3 : 1;
      render();
    });
    again.addEventListener('click', () => {
      state = deal(state.draw);
      history = [];
      selected = null;
      render();
    });
    render();
  },
};

function deal(draw = 1) {
  const deck = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank += 1) deck.push({ suit, rank, up: false });
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const columns = [];
  for (let c = 0; c < 7; c += 1) {
    const cards = [];
    for (let n = 0; n <= c; n += 1) cards.push(deck.pop());
    cards[cards.length - 1].up = true;
    columns.push(cards);
  }
  return { columns, stock: deck, waste: [], foundations: [[], [], [], []], moves: 0, draw, celebrated: false };
}

function color(suit) {
  return suit === 'heart' || suit === 'diamond' ? 'red' : 'black';
}

function canPlaceOn(under, card) {
  return color(under.suit) !== color(card.suit) && under.rank === card.rank + 1;
}

function canFoundation(pile, card) {
  if (!pile.length) return card.rank === 1;
  const top = pile[pile.length - 1];
  return top.suit === card.suit && top.rank + 1 === card.rank;
}

function canSelect(state, source) {
  const cards = peek(state, source);
  if (!cards.length || cards.some((card) => !card.up)) return false;
  for (let i = 0; i < cards.length - 1; i += 1) {
    if (!canPlaceOn(cards[i], cards[i + 1])) return false;
  }
  return true;
}

function peek(state, source) {
  if (source.where === 'waste') return state.waste.slice(-1);
  if (source.where === 'found') return state.foundations[source.index].slice(-1);
  return state.columns[source.col].slice(source.index);
}

function drawFromStock(state) {
  if (!state.stock.length) {
    state.stock = state.waste.reverse().map((card) => ({ ...card, up: false }));
    state.waste = [];
    return;
  }
  const count = Math.min(state.draw, state.stock.length);
  for (let i = 0; i < count; i += 1) {
    const card = state.stock.pop();
    card.up = true;
    state.waste.push(card);
  }
}

function moveSelection(state, source, target) {
  const cards = peek(state, source);
  if (!cards.length) return false;
  if (target.where === 'found') {
    if (cards.length !== 1 || !canFoundation(state.foundations[target.index], cards[0])) return false;
  } else if (target.where === 'col') {
    const column = state.columns[target.col];
    if (!column.length) {
      if (cards[0].rank !== 13) return false;
    } else if (!canPlaceOn(column[column.length - 1], cards[0])) return false;
    if (source.where === 'col' && source.col === target.col) return false;
  } else return false;
  remove(state, source);
  if (target.where === 'found') state.foundations[target.index].push(cards[0]);
  else state.columns[target.col].push(...cards);
  if (source.where === 'col') {
    const column = state.columns[source.col];
    if (column.length) column[column.length - 1].up = true;
  }
  return true;
}

function remove(state, source) {
  if (source.where === 'waste') state.waste.pop();
  else if (source.where === 'found') state.foundations[source.index].pop();
  else state.columns[source.col].splice(source.index);
}

function sameSelection(a, b) {
  return a.where === b.where && a.col === b.col && a.index === b.index;
}

function swallowClick(event) {
  const node = event.currentTarget;
  if (!node?.dataset?.dragged) return false;
  delete node.dataset.dragged;
  return true;
}

function cardEl(card, selected = false) {
  if (!card.up) return el('div', { class: 'card back', 'aria-hidden': 'true' });
  const node = el('button', { class: `card ${color(card.suit)}${selected ? ' selected' : ''}`, type: 'button' });
  node.innerHTML = `<span>${RANKS[card.rank - 1]}</span>${suitMark(card.suit)}<span class="card-corner">${RANKS[card.rank - 1]}</span>`;
  return node;
}

function suitMark(suit) {
  const paths = {
    heart: '<path d="M12 20s-6.2-4-6.2-8.2a3.4 3.4 0 0 1 6.2-1.9 3.4 3.4 0 0 1 6.2 1.9C18.2 16 12 20 12 20z"/>',
    diamond: '<path d="M12 3.2 19.2 12 12 20.8 4.8 12Z"/>',
    spade: '<path d="M12 3.2c3.6 3.6 6.4 6.2 6.4 9.2a3.5 3.5 0 0 1-5.7 2.7c.4 1.8 1.1 4.7 1.1 4.7H10s.7-2.9 1.1-4.7A3.5 3.5 0 0 1 5.6 12.4c0-3 2.8-5.6 6.4-9.2z"/>',
    club: '<circle cx="12" cy="8.4" r="2.7"/><circle cx="8.4" cy="12.6" r="2.7"/><circle cx="15.6" cy="12.6" r="2.7"/><path d="M11 14.2h2l.8 5.2h-3.6z"/>',
  };
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">${paths[suit]}</svg>`;
}
