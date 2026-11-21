'use strict';

const game = window.PrisonGame;
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const publicMode = params.has('board');
const cloud = window.PrisonRooms;
const roomId = params.get('room');
const hostId = !publicMode && params.get('host');
const remoteHost = Boolean(hostId);
let awaitingHost = remoteHost;
let online = false;
let busy = false;
let revision = -1;
let observedRevision = -1;
let pair = null;
let pairTimer = null;
const saveKey = 'ycmc-prison-escape-v7';
const boardKey = saveKey + '-public';
const palette = ['#ffd172','#7ce2e4','#ffa2b9','#b8e684','#cbb3ff','#ffac80',
  '#8abfff','#f9a2ea','#64e3b3','#d8db8b','#e2e8f1'];
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const imageIcons = {
  '🔑': 'key', '🗺️': 'map', '🎫': 'pass', '👣': 'steps', '🎲': 'die', '⚡': 'skill',
};
const imageIcon = type => '<span class="image-icon image-' + type + '" aria-hidden="true"></span>';
const icon = symbol => imageIcons[symbol] ? imageIcon(imageIcons[symbol]) :
  '<span class="icon" aria-hidden="true">' + symbol + '</span>';
const name = player => escapeHTML(player.name);
let storageError = false;

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; }
}

function publish() {
  try {
    localStorage.setItem(saveKey, JSON.stringify({ state, undo }));
    localStorage.setItem(boardKey, JSON.stringify(game.publicView(state)));
  } catch {
    storageError = true;
  }
}

let { state = null, undo = null } = publicMode || remoteHost ? {} : read(saveKey) || {};
let snapshot = publicMode && !roomId ? read(boardKey) : null;
let selected = state?.active ?? 0;
let setup = !state;
let count = state?.players.length ?? 8;
let names = state?.players.map(player => player.name) ?? [];
let tradeFrom = null;

const button = (label, action, extra = '', style = '') =>
  '<button type="button" class="' + style + '" data-action="' + action + '" ' + extra + '>' + label + '</button>';

function dispatch(action) {
  if (remoteHost) return remoteAction(action);
  const next = game.apply(state, action);
  if (next === state) return false;
  undo = state;
  if (state.active !== next.active) selected = next.active;
  if (state.phase !== next.phase) tradeFrom = null;
  state = next;
  publish();
  render();
  return true;
}

function token(player, interactive = false, marker = false) {
  const inner = '<span class="token" style="--token:' + palette[player.id] + '">' + (player.id + 1) + '</span>';
  if (!interactive) return inner;
  return button(inner, 'select', 'data-index="' + player.id + '" aria-label="' + name(player) + '" title="' +
    name(player) + '"', marker && player.id === state.active ? 'pawn current' : 'pawn');
}

function coordinates(index) {
  if (index < 6) return [1, index + 1];
  if (index < 11) return [index - 4, 6];
  if (index < 16) return [6, 16 - index];
  return [21 - index, 1];
}

function renderBoard(view) {
  const oldTokens = new Map([...$('board').querySelectorAll('[data-pawn]')].map(el =>
    [el.dataset.pawn, el.getBoundingClientRect()]));
  const players = view?.players ?? [];
  const active = view && view.phase !== 'ended' ? players[view.active] : null;
  const winner = view?.winners.length ? players[view.winners[0]] : null;
  const banner = winner ? '<span class="winner">🏆 ' + name(winner) + '</span>' : '';
  $('board-status').innerHTML = banner +
    '<div class="goal" aria-label="各收集一種物資，累計前進 20 格">' +
    game.materials.map(([label, symbol]) => '<span title="' + label + '">' + icon(symbol) + '</span>').join('') +
    '<b>＋</b><span title="累計前進 20 格">' + icon('👣') + '<strong>20</strong></span></div>';
  $('tiles').innerHTML = game.board.map((type, index) => {
      const [row, column] = coordinates(index);
      const [label] = game.tiles[type];
      const here = players.filter(player => player.square === index + 1);
      const crowded = here.length > 6 ? ' crowded' : '';
      const occupied = here.length ? ' occupied' : '';
      const highlight = active?.square === index + 1 ? ' active-tile' : '';
      return '<div class="tile ' + type + crowded + occupied + highlight + '" style="grid-area:' + row + '/' + column +
        '" title="' + (index + 1) + ' · ' + label + '"><span class="tile-number">' + (index + 1) + '</span>' +
        '<span class="tile-type" role="img" aria-label="' + label + '">' + imageIcon(type) + '</span>' +
        '<div class="pawns">' + here.map(player => '<span data-pawn="' + player.id + '">' +
          token(player, !publicMode && !setup, true) + '</span>').join('') + '</div></div>';
    }).join('');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $('board').querySelectorAll('[data-pawn]').forEach(el => {
      const old = oldTokens.get(el.dataset.pawn);
      if (!old) return;
      const current = el.getBoundingClientRect();
      const dx = old.left - current.left;
      const dy = old.top - current.top;
      if (!dx && !dy) return;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)', zIndex: 4 },
        { transform: 'translate(0,0)', zIndex: 4 }], { duration: 340, easing: 'ease-out' });
    });
  }
  $('legend').innerHTML = Object.entries(game.tiles).map(([type, [label]]) =>
    '<span>' + imageIcon(type) + ' ' + label + '</span>').join('');
}

function renderSetup() {
  const countOptions = Array.from({ length: 10 }, (_, index) => index + 2).map(value =>
    '<option value="' + value + '"' + (value === count ? ' selected' : '') + '>' + value + ' 人</option>').join('');
  $('panel').innerHTML = '<section class="card setup"><h2>開新局</h2><form id="setup-form">' +
    '<label class="count-label" for="player-count">玩家人數</label><select id="player-count">' + countOptions +
    '</select><div class="name-list">' + Array.from({ length: count }, (_, id) =>
      '<label>' + token({ id }) + '<input aria-label="玩家 ' + (id + 1) + ' 名字" maxlength="20" placeholder="玩家' +
      String(id + 1).padStart(2, '0') + '" value="' + escapeHTML(names[id] ?? '') + '" data-name="' + id + '"></label>').join('') +
    '</div><button type="submit" class="primary">▶　開始遊戲</button>' +
    (state ? button('返回本局', 'cancel-setup', '', 'quiet') : '') + '</form></section>';
}

function choice(label, type, index, style = '') {
  return button(label, type, 'data-index="' + index + '"', style);
}

function tradeControls(player, station) {
  const sources = game.surplus(player, station ? 2 : 3);
  const from = sources.includes(tradeFrom) ? tradeFrom : sources[0];
  const result = game.materials.map(([label, symbol], i) => i === from ? '' :
    button(icon(symbol) + ' ' + label, 'trade', 'data-index="' + i + '" data-from="' + from + '"')).join('');
  return '<h3>' + (station ? '交換站 · 1 → 1' : '物資交換 · 3 → 1') + '</h3>' +
    '<div class="trade-line"><div class="choices" aria-label="交出物資">' + sources.map(i =>
      choice(icon(game.materials[i][1]) + ' ' + game.materials[i][0], 'trade-source', i, from === i ? 'picked' : '')).join('') +
    '</div><span aria-hidden="true">↓</span><div class="choices" aria-label="換入物資">' + result +
    '</div></div>' + button('略過', 'trade', '', 'quiet');
}

function diceSkillChoices(player) {
  return (player.skills[0] ? '<span>加速</span>' +
      [1, 2, 3].map(i => choice('＋' + i, 'bonus', i)).join('') : '') +
    (player.skills[4] ? button('🎲 重新擲骰', 'reroll') : '');
}

function turnControls(player, next) {
  const { phase, proactive, pending } = state;
  if (state.paused) return '<h3>已暫停</h3>' + button('▶　繼續', 'pause', '', 'primary');
  if (phase === 'roll') {
    const swapTargets = player.skills[3] && !proactive ? state.players.filter(p => p !== player && !p.place) : [];
    const diceSkills = !proactive && (player.skills[0] || player.skills[4]);
    return button(icon('🎲') + '　擲骰前進', 'roll', '', 'primary roll-button') +
      (diceSkills ? '<details><summary>⚡ 使用技能</summary><div class="choices">' + diceSkillChoices(player) + '</div></details>' : '') +
      (swapTargets.length ? '<details><summary>🔀 位置交換</summary><div class="choices">' +
        swapTargets.map(p => choice(token(p) + ' ' + name(p), 'swap', p.id)).join('') + '</div></details>' : '');
  }
  if (phase === 'move') {
    return (!proactive ? '<div class="choices">' + diceSkillChoices(player) + '</div>' : '') +
      button('前進', 'move', '', 'primary');
  }
  if (phase === 'jail') return '<h3>🔒 禁閉</h3>' +
    (player.skills[1] ? button('🔓　逃離禁閉', 'jail', 'data-use="true"', 'primary') : '') +
    button('停一回合', 'jail', '', player.skills[1] ? 'quiet' : 'primary');
  if (phase === 'chooseMaterial') return '<h3>選 1 件物資</h3><div class="choices">' +
    game.materials.map(([label, symbol], i) => choice(icon(symbol) + ' ' + label, 'material', i)).join('') + '</div>';
  if (phase === 'protect') return '<h3>突擊搜查 · ' + icon(game.materials[pending][1]) + '</h3>' +
    button('🛡️　保護物資', 'protect', 'data-use="true"', 'primary') +
    button('交出物資', 'protect', '', 'quiet');
  if (phase === 'replace') return '<h3>技能已滿 · 抽到 ' + skillsLabel(pending) + '</h3><div class="choices">' +
    player.skills.map((quantity, i) => quantity ? choice('交出 ' + skillsLabel(i), 'replace', i) : '').join('') +
    '</div>' + choice('放棄新卡', 'replace', -1, 'quiet');
  if (phase === 'trade' || phase === 'station') return tradeControls(player, phase === 'station');
  if (phase === 'roundEnd') return '<h3>🏆 本輪完成</h3>' +
    button('繼續爭取名次', 'next', '', 'primary') + button('結算排名', 'end', '', 'quiet');
  const label = !next || state.winners.length >= 3 && next.id <= player.id ? '結算排名' :
    next.id <= player.id ? (state.championRound === state.round ? '完成本輪' : '下一輪') : '下一位';
  return button(label + '　→', 'next', '', 'primary');
}

function skillsLabel(i) {
  return icon(game.skills[i][1]) + ' ' + game.skills[i][0];
}

function turnCards(view) {
  const reveals = view.reveals ?? [];
  return reveals.length ? '<div class="turn-cards" aria-label="本回合卡牌">' + reveals.map(card => {
    if (card.kind === 'material') {
      const [title, symbol] = game.materials[card.index];
      return '<article class="reveal-card resource-card">' + icon(symbol) +
        '<div><small>獲得物資</small><strong>' + title + '</strong></div><b class="gain-quantity">＋1</b></article>';
    }
    const event = card.kind === 'event';
    const eventImages = [0, 1, 2, 5, 4, 5, 6, 6];
    const image = event ? eventImages[card.index] : card.index + 8;
    const title = event ? game.events[card.index] : game.skills[card.index][0];
    const captions = { event: '事件卡', draw: '抽到技能', gainSkill: '獲得技能', skill: '技能發動' };
    const caption = captions[card.kind];
    const detail = card.detail ?? (event ? game.eventEffects[card.index] : game.skills[card.index][2]);
    return '<article class="reveal-card ' + (event ? 'event-card' : 'skill-card') + '">' +
      '<div class="reveal-image" style="--x:' + (image % 4 * 100 / 3) + '%;--y:' +
      (Math.floor(image / 4) * 100 / 3) + '%" aria-hidden="true"></div><div><small>' +
      caption + '</small><strong>' + title + '</strong><span>' + escapeHTML(detail) + '</span></div></article>';
  }).join('') + '</div>' : '';
}

function renderPanel(view) {
  if (awaitingHost) {
    $('panel').innerHTML = '<section class="card session-card"><h2>手機主持</h2>' +
      button(location.hash ? '連接課堂' : '重新連接', 'claim', '', 'primary') + '</section>';
    return;
  }
  if (!view && publicMode) {
    $('panel').innerHTML = '<section class="card"><h2>等候主持開局</h2></section>';
    return;
  }
  if (setup && !publicMode) { renderSetup(); return; }
  if (view.phase === 'ended') {
    const ranked = publicMode ? view.ranks.map(id => view.players[id]) : game.rankings(view);
    $('panel').innerHTML = '<section class="card"><h2>🏆 最終排名</h2><ol class="ranking">' +
      ranked.map(p => '<li>' + token(p) + ' <strong>' + name(p) + '</strong>' +
        (p.place ? '<span title="成功逃出">🏁</span>' : '') + '</li>').join('') + '</ol></section>';
    return;
  }
  const player = view.players[view.active];
  const next = !publicMode && game.nextPlayer(view);
  $('panel').innerHTML = '<section class="card turn"><div class="turn-top"><span>第 ' + view.round +
    ' 輪</span>' + (next && next !== player ? '<small>下一位　' + name(next) + '</small>' : '') +
    '</div><h2>' + token(player) + ' ' + name(player) + '</h2>' +
    '<div class="turn-feed" aria-live="polite">' + turnCards(view) +
    (view.notice && !view.reveals?.length ? '<p class="notice">' + escapeHTML(view.notice) + '</p>' : '') + '</div>' +
    (!publicMode ? '<div class="turn-actions">' + turnControls(player, next) + '</div>' : '') + '</section>';
}

function renderInventory(view) {
  $('inventory').hidden = publicMode || !view || setup;
  if ($('inventory').hidden) return;
  const current = view.players[selected];
  const columns = [...game.materials, ...game.skills];
  $('inventory-body').innerHTML = '<div class="inventory-top">' + button('紀錄', 'history') + button('修正', 'edit-open',
    state.paused || !['roll', 'jail', 'next', 'roundEnd'].includes(state.phase) ? 'disabled' : '') +
    '</div><div class="table-scroll"><table><thead><tr><th scope="col">玩家</th><th scope="col">格</th>' +
    columns.map(([label, symbol, hint]) => '<th scope="col" title="' + escapeHTML(hint ? label + ' · ' + hint : label) +
      '"><span class="sr-only">' + label + '</span>' + icon(symbol) + '</th>').join('') +
    '<th scope="col" title="技能總數">技能</th><th scope="col">👣 進度</th></tr></thead><tbody>' +
    view.players.map(p => '<tr' + (current === p ? ' class="selected"' : '') +
      '><th scope="row">' + choice(token(p) + ' ' + name(p), 'select', p.id, 'row-select') +
      (p.jailed ? ' <span title="禁閉">🔒</span>' : '') + (p.place ? ' <span title="第 ' + p.place + ' 名">🏅</span>' : '') +
      '</th><td>' + p.square + '</td>' + [...p.materials, ...p.skills].map(quantity =>
        '<td class="' + (quantity ? 'quantity' : 'zero') + '">' + quantity + '</td>').join('') +
      '<td>' + game.total(p.skills) + '/2</td><td><div class="progress"><progress aria-label="前進格數" max="20" value="' +
      Math.min(p.steps, 20) + '"></progress><strong>' + p.steps + (p.steps >= 20 ? ' ✓' : '/20') +
      '</strong></div></td></tr>').join('') + '</tbody></table></div>';
}

function setupFullscreen() {
  const control = $('fullscreen');
  const root = document.documentElement;
  const enter = root.requestFullscreen || root.webkitRequestFullscreen;
  function updateControl() {
    control.hidden = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  }
  updateControl();
  document.addEventListener('fullscreenchange', updateControl);
  document.addEventListener('webkitfullscreenchange', updateControl);
  control.addEventListener('click', async () => {
    const status = $('fullscreen-status');
    status.hidden = true;
    try {
      if (enter) {
        await enter.call(root);
        return;
      }
    } catch {
      // The browser or an embedded preview can block fullscreen.
    }
    status.textContent = '此瀏覽器未能切換全螢幕。請用電腦瀏覽器直接開啟大屏。';
    status.hidden = false;
  });
}

function fitPublicPanel() {
  const panel = $('panel');
  const art = panel.parentElement;
  const padding = parseFloat(getComputedStyle(art).paddingTop) + parseFloat(getComputedStyle(art).paddingBottom);
  const scale = Math.min(1, (art.clientHeight - padding - 4) / Math.max(panel.offsetHeight, 1));
  panel.style.setProperty('--panel-scale', Math.max(0.1, scale));
}

function render() {
  const view = publicMode ? snapshot : setup ? null : state;
  document.body.classList.toggle('public', publicMode);
  document.body.classList.toggle('remote-host', remoteHost);
  const screen = remoteHost ? cloud.url('board', hostId) : '?board';
  $('tools').innerHTML = publicMode || awaitingHost ? '' : '<a class="button" href="' + escapeHTML(screen) +
    '" target="_blank" rel="noopener"><span aria-hidden="true">▣</span>　開啟大屏</a>' +
    (!remoteHost ? button('⌗　手機主持', 'pair') : '') +
    (state && !setup ? button(state.paused ? '繼續' : '暫停', 'pause', state.phase === 'ended' ? 'disabled' : '') +
      button('↶　撤銷', 'undo', undo ? '' : 'disabled') + '<details><summary>更多</summary><div class="menu">' +
      button('新遊戲', 'new') + button('結算排名', 'end', game.canEnd(state) ? '' : 'disabled') +
      '</div></details>' : '');
  renderPanel(view);
  renderBoard(view);
  renderInventory(view);
  lockRemoteControls();
  if (storageError) $('tools').insertAdjacentHTML('afterbegin', '<span role="alert">本機儲存失敗</span>');
}

function openPlayerDialog(edit) {
  const player = state.players[selected];
  const dialog = $('dialog');
  const numeric = (label, key, value, min, max) => '<label>' + label + '<input name="' + key +
    '" type="number" min="' + min + '" max="' + max + '" value="' + value + '" required></label>';
  dialog.innerHTML = '<div class="dialog-title"><h2>' + (edit ? '修正 · ' : '紀錄 · ') + name(player) + '</h2>' +
    button('✕', 'close', 'aria-label="關閉"') + '</div>' + (edit ? '<form id="edit-form">' +
      '<div class="edit-grid">' + numeric('所在格', 'square', player.square, 1, 20) +
      numeric('累計前進', 'steps', player.steps, 0, 100000) +
      game.materials.map(([label, symbol], i) => numeric(icon(symbol) + label, 'm' + i, player.materials[i], 0, 1000)).join('') +
      game.skills.map(([label, symbol], i) => numeric(icon(symbol) + label, 's' + i, player.skills[i], 0, 2)).join('') +
      '</div><label class="checkbox"><input type="checkbox" name="jailed"' + (player.jailed ? ' checked' : '') +
      '>　下回合禁閉</label><p id="edit-error" role="alert"></p><button type="submit" class="primary">儲存修正</button></form>' :
      '<ol class="history">' + (player.log.length ? player.log.slice().reverse().map(entry =>
        '<li><small>第 ' + entry.round + ' 輪</small> ' + escapeHTML(entry.message) + '</li>').join('') :
        '<li>尚無紀錄</li>') + '</ol>');
  dialog.showModal();
}

function connection(message, error = false) {
  const indicator = $('connection');
  indicator.textContent = message;
  indicator.hidden = !message;
  indicator.classList.toggle('error', error);
}

function lockRemoteControls() {
  const locked = remoteHost && !awaitingHost && (!online || busy);
  document.querySelector('.layout').inert = locked;
  if (remoteHost) $('tools').querySelectorAll('button').forEach(control => {
    if (locked && !control.disabled) {
      control.disabled = true;
      control.dataset.syncLock = 'true';
    } else if (!locked && control.dataset.syncLock) {
      control.disabled = false;
      delete control.dataset.syncLock;
    }
  });
}

function receiveHost(value, started = false) {
  if (value.revision < revision) return;
  const activeChanged = state?.active !== value.state?.active;
  const phaseChanged = state?.phase !== value.state?.phase;
  const firstLoad = awaitingHost;
  revision = value.revision;
  state = value.state;
  undo = value.canUndo;
  awaitingHost = false;
  if (activeChanged || started || firstLoad) selected = state?.active ?? 0;
  if (phaseChanged || started) tradeFrom = null;
  if (started || firstLoad) {
    setup = !state;
    count = state?.players.length ?? 8;
    names = state?.players.map(player => player.name) ?? [];
  }
  render();
}

async function remoteAction(action) {
  if (!online || busy) return false;
  busy = true;
  lockRemoteControls();
  connection('正在同步…');
  try {
    receiveHost(await cloud.act(hostId, revision, action), action.type === 'start');
    if (observedRevision > revision) receiveHost(await cloud.load(hostId));
    if (online) connection('已連接 · 手機主持');
    return true;
  } catch (error) {
    if (error.status === 409) receiveHost(error.result);
    connection(error.message, true);
    return false;
  } finally {
    busy = false;
    lockRemoteControls();
  }
}

async function connectHost() {
  if (busy) return;
  if (!cloud.roomPattern.test(hostId)) {
    connection('配對連結無效。', true);
    return;
  }
  busy = true;
  connection('正在連接課堂…');
  try {
    const key = location.hash.slice(1);
    const value = key ? await cloud.claim(hostId, key) : await cloud.load(hostId);
    if (key) history.replaceState(null, '', cloud.url('host', hostId));
    receiveHost(value);
    cloud.listen(hostId, {
      update: async event => {
        observedRevision = Math.max(observedRevision, event.revision);
        const reconnect = !online;
        if (!busy && event.revision > revision) {
          try { receiveHost(await cloud.load(hostId)); }
          catch (error) { connection(error.message, true); return; }
        }
        online = true;
        lockRemoteControls();
        if (reconnect) connection('已連接 · 手機主持');
      },
      disconnect: closed => {
        online = false;
        lockRemoteControls();
        connection(closed ? '課堂已結束。' : '連線中斷 · 正在重連', true);
      },
      close: () => {
        online = false;
        lockRemoteControls();
        connection('課堂已結束。', true);
      },
    });
  } catch (error) {
    connection(error.message, true);
  } finally {
    busy = false;
    lockRemoteControls();
  }
}

function paintPair(address) {
  const link = cloud.url('host', pair.id, pair.key, address);
  const qr = qrcode(0, 'M');
  qr.addData(link);
  qr.make();
  $('pair-code').innerHTML = qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true });
  $('pair-link').href = link;
  $('pair-link').textContent = link;
}

async function openPair() {
  const dialog = $('dialog');
  dialog.innerHTML = '<div class="dialog-title"><h2>手機主持</h2>' +
    button('✕', 'close', 'aria-label="關閉"') + '</div><p id="pair-status" role="status">正在建立課堂…</p>';
  dialog.showModal();
  try {
    const ticket = await cloud.create();
    if (!dialog.open || !$('pair-status')) return;
    pair = ticket;
    const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
    const addresses = [...new Set([...(local ? [] : [location.origin]), ...ticket.urls])];
    if (!addresses.length) {
      $('pair-status').textContent = '找不到可用的 Wi‑Fi 位址。請將電腦連上區域網絡後再試。';
      return;
    }
    dialog.insertAdjacentHTML('beforeend', '<div id="pair-code" class="pair-code" aria-label="手機主持配對 QR code"></div>' +
      (addresses.length > 1 ? '<label class="pair-address">網絡位址 <select id="pair-address">' +
        addresses.map(address => '<option>' + escapeHTML(address) + '</option>').join('') + '</select></label>' : '') +
      '<details><summary>主持連結</summary><a id="pair-link" class="pair-link" rel="noreferrer">開啟連結</a></details>');
    const instruction = cloud.hosted ? '用主持手機掃碼' : '同一 Wi‑Fi 掃碼';
    $('pair-status').textContent = instruction + (state ? '開新局 · 本機局會保留' : ' · 10 分鐘有效');
    paintPair(addresses[0]);
    $('pair-address')?.addEventListener('change', event => paintPair(event.target.value));
    const expiry = () => {
      if ($('pair-status')) $('pair-status').textContent = 'QR 已過期，請關閉後重新建立。';
      $('pair-code')?.replaceChildren();
      $('pair-link')?.removeAttribute('href');
    };
    const stop = cloud.listen(ticket.id, {
      update: value => {
        if (value.claimed) {
          stop();
          location.assign(cloud.url('board', ticket.id));
        }
      },
      disconnect: closed => { if (closed) expiry(); },
      close: expiry,
    });
    pairTimer = setTimeout(() => { expiry(); stop(); }, Math.max(0, ticket.claimUntil - Date.now()));
    dialog.addEventListener('close', () => { stop(); clearTimeout(pairTimer); pair = null; }, { once: true });
  } catch (error) {
    if ($('pair-status')) $('pair-status').textContent = error.message;
  }
}

if (publicMode && roomId) {
  connection('正在連接大屏…');
  if (cloud.roomPattern.test(roomId)) {
    cloud.listen(roomId, {
      update: value => {
        snapshot = value.board;
        connection(value.claimed ? '' : '等候主持裝置連接');
        render();
      },
      disconnect: closed => connection(closed ? '課堂已結束。' : '連線中斷 · 保留目前畫面', true),
      close: () => connection('課堂已結束。', true),
    });
  } else connection('課堂連結無效。', true);
} else if (publicMode) {
  window.addEventListener('storage', event => {
    if (event.key === boardKey || event.key === null) {
      snapshot = read(boardKey);
      render();
    }
  });
} else {
  document.addEventListener('input', event => {
    if (event.target.matches('[data-name]')) names[Number(event.target.dataset.name)] = event.target.value;
  });

  document.addEventListener('change', event => {
    if (event.target.id === 'player-count') {
      count = Number(event.target.value);
      renderSetup();
      $('player-count').focus();
    }
  });

  document.addEventListener('submit', async event => {
    event.preventDefault();
    if (event.target.id === 'setup-form') {
      if (state && !confirm('開始新局並清除舊局？')) return;
      const roster = Array.from({ length: count }, (_, i) => names[i] ?? '');
      if (remoteHost) {
        await remoteAction({ type: 'start', names: roster });
        return;
      }
      state = game.start(roster);
      undo = null;
      selected = 0;
      tradeFrom = null;
      setup = false;
      publish();
      render();
    }
    if (event.target.id === 'edit-form') {
      const form = new FormData(event.target);
      const data = {
        square: Number(form.get('square')), steps: Number(form.get('steps')), jailed: form.has('jailed'),
        materials: game.materials.map((_, i) => Number(form.get('m' + i))),
        skills: game.skills.map((_, i) => Number(form.get('s' + i))),
      };
      if (game.total(data.skills) > 2) { $('edit-error').textContent = '最多持有 2 張技能。'; return; }
      if (await dispatch({ type: 'edit', index: selected, data })) $('dialog').close();
      else $('edit-error').textContent = '現在無法修正，請檢查回合狀態。';
    }
  });

  document.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (!control || control.disabled || event.detail > 1) return;
    const { action: type, index, from, use } = control.dataset;
    switch (type) {
      case 'pair':
        openPair();
        break;
      case 'claim':
        connectHost();
        break;
      case 'new':
        names = state.players.map(p => p.name);
        count = names.length;
        setup = true;
        render();
        break;
      case 'cancel-setup':
        setup = false;
        render();
        break;
      case 'select':
        $('inventory').open = true;
        selected = Number(index);
        renderInventory(state);
        if (control.classList.contains('row-select')) {
          $('inventory').querySelector('[data-index="' + index + '"]').focus({ preventScroll: true });
        }
        break;
      case 'undo':
        if (!undo || !confirm('撤銷上一步？')) break;
        if (remoteHost) {
          remoteAction({ type: 'undo' });
          break;
        }
        state = undo;
        undo = null;
        selected = state.active;
        tradeFrom = null;
        publish();
        render();
        break;
      case 'history':
      case 'edit-open':
        openPlayerDialog(type === 'edit-open');
        break;
      case 'close':
        $('dialog').close();
        break;
      case 'trade-source':
        tradeFrom = Number(index);
        renderPanel(state);
        $('panel').querySelector('.picked').focus();
        break;
      default:
        if (type === 'end' && !confirm('結束遊戲並顯示排名？')) return;
        dispatch({ type, index: Number(index),
          from: from === undefined ? undefined : Number(from), use: use === 'true' });
    }
  });
  if (state && !remoteHost) publish();
  if (remoteHost) {
    window.addEventListener('offline', () => {
      online = false;
      lockRemoteControls();
      connection('連線中斷 · 正在重連', true);
    });
    window.addEventListener('online', async () => {
      if (awaitingHost || busy) return;
      try {
        receiveHost(await cloud.load(hostId));
        online = true;
        lockRemoteControls();
        connection('已連接 · 手機主持');
      } catch (error) {
        connection(error.message, true);
      }
    });
    if (!location.hash) connectHost();
  }
}

render();
if (publicMode) {
  setupFullscreen();
  const sizer = new ResizeObserver(fitPublicPanel);
  sizer.observe($('panel'));
  sizer.observe($('panel').parentElement);
}
