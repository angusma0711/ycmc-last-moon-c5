(function (root) {
  'use strict';

  const materials = [
    ['鑰匙', '🔑'], ['路線圖', '🗺️'], ['通行證', '🎫'],
  ];
  const skills = [
    ['加速前進', '⚡', '額外前進 1–3 格'],
    ['逃離禁閉', '🔓', '取消本次停一回合'],
    ['保護物資', '🛡️', '阻止這次物資損失'],
    ['位置交換', '🔀', '擲骰前交換位置'],
    ['重新擲骰', '🎲', '必須接受第二次點數'],
  ];
  const tiles = {
    start: ['起點', '⚑'], material: ['物資', '📦'], blank: ['空白', '·'],
    skill: ['技能', '⚡'], jail: ['禁閉', '🔒'], event: ['事件', '❔'], exchange: ['交換站', '⇄'],
  };
  const board = ['start', 'material', 'blank', 'skill', 'jail', 'material', 'event', 'blank',
    'material', 'skill', 'blank', 'jail', 'material', 'event', 'blank', 'skill', 'material',
    'blank', 'event', 'exchange'];
  const events = ['神秘包裹', '意外發現', '秘密走廊', '幸運巡查', '突擊搜查', '違反作息', '走錯通道', '平安無事'];
  const eventEffects = ['隨機獲得 1 件物資', '選擇 1 件物資', '前進 2 格並觸發新格',
    '解除禁閉', '可能失去 1 件物資', '下回合停一次', '退後 2 格', '安全通過'];

  function start(names) {
    if (names.length < 2 || names.length > 11) throw new RangeError('玩家人數須為 2–11');
    const state = {
      players: names.map((name, id) => ({
        id, name: String(name).trim().slice(0, 20) || '玩家' + String(id + 1).padStart(2, '0'),
        square: 1, steps: 0, materials: [0, 0, 0], skills: [0, 0, 0, 0, 0],
        jailed: false, place: 0, log: [],
      })),
      round: 1, active: 0, winners: [], deck: [], phase: 'roll', die: 0, bonus: 0,
      proactive: false, paused: false, championRound: 0, notice: '遊戲開始',
    };
    beginTurn(state, 0);
    state.notice = '遊戲開始';
    return state;
  }

  const total = counts => counts.reduce((sum, count) => sum + count, 0);
  const eligible = player => player.steps >= 20 && player.materials.every(Boolean);
  const playable = state => state.players.filter(player => !player.place);
  const surplus = (player, cost) => player.materials.flatMap((quantity, index) => quantity >= cost ? [index] : []);
  const whole = (number, min, max) => Number.isInteger(number) && number >= min && number <= max;
  const pick = (items, random) => items[Math.floor(random() * items.length)];

  function record(state, player, message, publicNotice = true) {
    player.log.push({ round: state.round, message });
    if (publicNotice) state.notice = player.name + ' · ' + message;
  }

  function reveal(state, kind, index, detail) {
    (state.reveals ??= []).push({ kind, index, detail });
  }

  function checkWinner(state, player) {
    if (player.place || !eligible(player)) return;
    state.winners.push(player.id);
    player.place = state.winners.length;
    if (player.place === 1) state.championRound = state.round;
    record(state, player, player.place === 1 ? '🏆 冠軍！成功逃出' : '🏅 第 ' + player.place + ' 名');
  }

  function finish(state) {
    state.phase = 'next';
    checkWinner(state, state.players[state.active]);
  }

  function offerRegularTrade(state, player) {
    if (surplus(player, 2).length) state.phase = 'trade';
    else finish(state);
  }

  function gainMaterial(state, player, index, log = true) {
    player.materials[index]++;
    reveal(state, 'material', index);
    if (log) record(state, player, '+1 ' + materials[index][0]);
  }

  function move(state, player, distance) {
    player.square = ((player.square - 1 + distance + 20) % 20) + 1;
    player.steps += Math.max(0, distance);
    record(state, player, (distance > 0 ? '+' : '') + distance + ' 格 → ' + player.square, false);
  }

  function draw(state, random) {
    if (!state.deck.length) {
      state.deck = events.map((_, i) => i);
      for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
      }
    }
    return state.deck.pop();
  }

  function resolveLanding(state, player, random, depth = 0) {
    if (depth >= 8) {
      record(state, player, '連續事件已達上限');
      offerRegularTrade(state, player);
      return;
    }
    const tile = board[player.square - 1];
    if (tile === 'event') {
      const event = draw(state, random);
      state.turnEvents.push(events[event]);
      reveal(state, 'event', event);
      record(state, player, events[event]);
      switch (event) {
        case 0:
          gainMaterial(state, player, pick([0, 1, 2], random));
          break;
        case 1:
          state.phase = 'chooseMaterial';
          return;
        case 2:
          move(state, player, 2);
          resolveLanding(state, player, random, depth + 1);
          return;
        case 3:
          player.jailed = false;
          break;
        case 4: {
          const owned = [0, 1, 2].filter(i => player.materials[i]);
          if (!owned.length) break;
          const target = pick(owned, random);
          if (player.skills[2]) {
            state.pending = target;
            state.phase = 'protect';
            return;
          }
          loseMaterial(state, player, target);
          break;
        }
        case 5:
          player.jailed = true;
          break;
        case 6:
          move(state, player, -2);
          break;
      }
    }
    if (tile === 'material') gainMaterial(state, player, pick([0, 1, 2], random));
    if (tile === 'skill') {
      const skill = pick([0, 1, 2, 3, 4], random);
      if (total(player.skills) === 2) {
        reveal(state, 'draw', skill);
        state.pending = skill;
        state.phase = 'replace';
        record(state, player, '抽到 ' + skills[skill][0] + ' · 技能已滿');
        return;
      }
      player.skills[skill]++;
      reveal(state, 'gainSkill', skill);
      record(state, player, '+1 ' + skills[skill][0]);
    }
    if (tile === 'jail') {
      player.jailed = true;
      record(state, player, '🔒 下一回合停一回合');
    }
    if (tile === 'exchange') {
      if (surplus(player, 2).length) {
        state.phase = 'station';
        return;
      }
      record(state, player, '交換站 · 沒有多餘物資');
    }
    offerRegularTrade(state, player);
  }

  function roll(state, player, random) {
    state.die = pick([1, 2, 3, 4, 5, 6], random);
    state.notice = '';
    record(state, player, '擲骰 · ' + state.die, false);
  }

  function settleMove(state, player, random) {
    move(state, player, state.die + state.bonus);
    resolveLanding(state, player, random);
  }

  function loseMaterial(state, player, index) {
    player.materials[index]--;
    record(state, player, '−1 ' + materials[index][0]);
  }

  function beginTurn(state, active) {
    state.active = active;
    state.die = 0;
    state.bonus = 0;
    state.proactive = false;
    state.turnEvents = [];
    state.reveals = [];
    state.phase = state.players[active].jailed ? 'jail' : 'roll';
    state.notice = state.phase === 'jail' ? '🔒 本回合禁閉' : '';
  }

  function nextPlayer(state) {
    return playable(state).find(player => player.id > state.active) || playable(state)[0];
  }

  function canEnd(state) {
    if (!['roll', 'jail', 'next', 'roundEnd'].includes(state.phase) || state.paused) return false;
    const next = nextPlayer(state);
    return state.championRound !== state.round || state.phase === 'roundEnd' ||
      (state.phase === 'next' && (!next || next.id <= state.active));
  }

  function rankings(state) {
    const score = player => [player.materials.filter(Boolean).length, Number(player.steps >= 20), total(player.skills), player.steps];
    return state.players.slice().sort((a, b) => {
      if (a.place || b.place) return (a.place || Infinity) - (b.place || Infinity);
      const first = score(a);
      const second = score(b);
      for (let i = 0; i < first.length; i++) {
        if (first[i] !== second[i]) return second[i] - first[i];
      }
      return a.id - b.id;
    });
  }

  function apply(previous, action, random = Math.random) {
    if (!previous) return previous;
    const state = JSON.parse(JSON.stringify(previous));
    const player = state.players[state.active];
    const phase = state.phase;
    const index = action.index;
    if (phase === 'ended') return previous;
    if (action.type === 'pause') {
      state.paused = !state.paused;
      return state;
    }
    if (state.paused) return previous;
    switch (action.type) {
      case 'roll':
        if (phase !== 'roll') return previous;
        roll(state, player, random);
        settleMove(state, player, random);
        break;
      case 'reroll':
        if (!['roll', 'move'].includes(phase) || state.proactive || !player.skills[4]) return previous;
        if (phase === 'roll') roll(state, player, random);
        state.proactive = true;
        player.skills[4]--;
        roll(state, player, random);
        reveal(state, 'skill', 4);
        settleMove(state, player, random);
        break;
      case 'bonus':
        if (!['roll', 'move'].includes(phase) || state.proactive || !player.skills[0] || !whole(index, 1, 3)) return previous;
        if (phase === 'roll') roll(state, player, random);
        state.proactive = true;
        state.bonus = index;
        player.skills[0]--;
        reveal(state, 'skill', 0, '額外前進 ' + index + ' 格');
        record(state, player, '加速前進 +' + index, false);
        settleMove(state, player, random);
        break;
      case 'swap': {
        const target = state.players[index];
        if (phase !== 'roll' || state.proactive || !player.skills[3] || !target || target === player || target.place) return previous;
        [player.square, target.square] = [target.square, player.square];
        state.proactive = true;
        player.skills[3]--;
        reveal(state, 'skill', 3, '與 ' + target.name + ' 交換位置');
        record(state, player, '位置交換 ↔ ' + target.name);
        record(state, target, '與 ' + player.name + ' 交換位置', false);
        break;
      }
      case 'move':
        if (phase !== 'move') return previous;
        settleMove(state, player, random);
        break;
      case 'jail':
        if (phase !== 'jail' || (action.use && !player.skills[1])) return previous;
        player.jailed = false;
        if (action.use) {
          player.skills[1]--;
          state.phase = 'roll';
          reveal(state, 'skill', 1);
          record(state, player, '使用逃離禁閉');
        } else {
          record(state, player, '🔒 停一回合');
          finish(state);
        }
        break;
      case 'material':
        if (phase !== 'chooseMaterial' || !whole(index, 0, 2)) return previous;
        gainMaterial(state, player, index);
        offerRegularTrade(state, player);
        break;
      case 'protect':
        if (phase !== 'protect') return previous;
        if (action.use) {
          player.skills[2]--;
          reveal(state, 'skill', 2, '保住 ' + materials[state.pending][0]);
          record(state, player, '使用保護物資');
        } else {
          loseMaterial(state, player, state.pending);
        }
        offerRegularTrade(state, player);
        break;
      case 'replace':
        if (phase !== 'replace') return previous;
        if (index === -1) {
          record(state, player, '放棄 ' + skills[state.pending][0]);
        } else {
          if (!whole(index, 0, 4) || !player.skills[index]) return previous;
          player.skills[index]--;
          player.skills[state.pending]++;
          const draw = state.reveals?.at(-1);
          if (draw?.kind === 'draw') draw.kind = 'gainSkill';
          else reveal(state, 'gainSkill', state.pending);
          record(state, player, skills[index][0] + ' → ' + skills[state.pending][0]);
        }
        offerRegularTrade(state, player);
        break;
      case 'trade': {
        if (phase !== 'trade' && phase !== 'station') return previous;
        const cost = phase === 'trade' ? 2 : 1;
        if (action.from !== undefined) {
          if (!surplus(player, 2).includes(action.from) || !whole(index, 0, 2) || action.from === index) return previous;
          player.materials[action.from] -= cost;
          gainMaterial(state, player, index, false);
          record(state, player, cost + ' ' + materials[action.from][0] + ' → 1 ' + materials[index][0]);
        }
        if (phase === 'station') offerRegularTrade(state, player);
        else finish(state);
        break;
      }
      case 'next': {
        if (phase !== 'next' && phase !== 'roundEnd') return previous;
        const next = nextPlayer(state);
        if (!next || (state.winners.length >= 3 && next.id <= state.active)) {
          state.phase = 'ended';
          break;
        }
        if (next.id <= state.active) {
          if (state.championRound === state.round && phase !== 'roundEnd') {
            state.phase = 'roundEnd';
            break;
          }
          state.round++;
        }
        beginTurn(state, next.id);
        break;
      }
      case 'edit': {
        const target = state.players[index];
        const data = action.data;
        if (!target || !['roll', 'jail', 'next', 'roundEnd'].includes(phase)
          || !whole(data.square, 1, 20) || !whole(data.steps, 0, 100000)
          || typeof data.jailed !== 'boolean'
          || data.materials.length !== 3 || !data.materials.every(n => whole(n, 0, 1000))
          || data.skills.length !== 5 || !data.skills.every(n => whole(n, 0, 2)) || total(data.skills) > 2) return previous;
        const before = target.square + '格／' + target.steps + '步／物資 ' + target.materials.join('/') +
          '／技能 ' + target.skills.join('/') + '／禁閉 ' + Number(target.jailed);
        Object.assign(target, data);
        const after = target.square + '格／' + target.steps + '步／物資 ' + target.materials.join('/') +
          '／技能 ' + target.skills.join('/') + '／禁閉 ' + Number(target.jailed);
        record(state, target, '主持修正 · ' + before + ' → ' + after, false);
        checkWinner(state, target);
        if (index === state.active && (phase === 'jail' || phase === 'roll')) {
          state.phase = target.place ? 'next' : target.jailed ? 'jail' : 'roll';
        }
        break;
      }
      case 'end':
        if (!canEnd(state)) return previous;
        state.phase = 'ended';
        break;
      default:
        return previous;
    }
    return state;
  }

  function publicView(state) {
    if (!state) return null;
    const { round, active, phase, paused, notice, winners, turnEvents, reveals = [] } = state;
    const players = state.players.map(({ id, name, square, steps, materials, jailed, place }) =>
      ({ id, name, square, steps, materials, jailed, place }));
    const ranks = phase === 'ended' ? rankings(state).map(player => player.id) : [];
    return { round, active, phase, paused, notice, winners, turnEvents, reveals, players, ranks };
  }

  const game = { materials, skills, tiles, board, events, eventEffects, start, apply, total, surplus, rankings, nextPlayer, canEnd, publicView };
  if (typeof module === 'object' && module.exports) module.exports = game;
  else root.PrisonGame = game;
})(globalThis);
