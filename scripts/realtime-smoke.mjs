/* eslint-disable no-await-in-loop -- Game turns and acknowledgements must run in order. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const base = (process.argv[2] || 'http://localhost:1999').replace(/\/$/, '');
const room = `smoke-${randomUUID().slice(0, 8)}`;
const clients = [];

async function until(predicate, label) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const errors = clients.flatMap((client) => client.errors);
    assert.deepEqual(errors, [], 'No server errors during the multiplayer scenario');
    if (predicate()) return;
    await delay(25);
  }
  throw new Error(`Timed out: ${label}`);
}

function newPersistentId() {
  return `player-${Date.now()}-${randomUUID().replaceAll('-', '').slice(0, 7)}`;
}

function openSocket(roomId) {
  const url = new URL(`/parties/main/${roomId}`, base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('_pk', randomUUID());
  return new WebSocket(url);
}

/** `joinFields` go into JOIN_GAME: none for the legacy protocol, `protocolVersion` (+ token) for protocol 2. */
async function connect(name, persistentId = newPersistentId(), joinFields = {}, roomId = room) {
  const socket = openSocket(roomId);
  const client = { name, persistentId, socket, state: null, playerId: null, session: null, revision: 0, errors: [] };
  clients.push(client);
  socket.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data);
    if (event.type === 'ERROR') client.errors.push(event.message);
    if (event.type === 'SESSION') client.session = event;
    if (event.type === 'GAME_STATE') {
      client.state = event.state;
      client.playerId = event.yourPlayerId;
      client.revision++;
    }
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name}: WebSocket connection timed out`)), 15_000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', (error) => { clearTimeout(timer); reject(error); }, { once: true });
  });
  socket.send(JSON.stringify({ type: 'JOIN_GAME', playerName: name, persistentId, ...joinFields }));
  await until(() => client.state !== null, `${name} joins`);
  return client;
}

/** Sends one JOIN_GAME from a fresh socket and resolves with the ERROR code it is refused with. */
async function refusedJoin(roomId, join, label) {
  const socket = openSocket(roomId);
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 15_000);
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'JOIN_GAME', ...join }));
      }, { once: true });
      socket.addEventListener('message', ({ data }) => {
        const event = JSON.parse(data);
        if (event.type === 'GAME_STATE') { clearTimeout(timer); reject(new Error(`Seated instead: ${label}`)); }
        if (event.type === 'ERROR') { clearTimeout(timer); resolve(event.code); }
      });
      socket.addEventListener('error', (error) => { clearTimeout(timer); reject(error); }, { once: true });
    });
  } finally {
    socket.close(1000, 'Smoke test finished');
  }
}

/** Tournament match rooms (`t-` + 14 id characters) seat ticket holders only (docs/accounts/tournaments.md). */
const TOURNAMENT_ROOM_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const TOURNAMENT_JOIN_REFUSALS = ['TOURNAMENT_TICKET_REQUIRED', 'TOURNAMENTS_UNAVAILABLE'];

async function refusedTournamentJoin() {
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  const matchRoom = `t-${Array.from(bytes, (byte) => TOURNAMENT_ROOM_ALPHABET[byte % TOURNAMENT_ROOM_ALPHABET.length]).join('')}`;
  const refusal = await refusedJoin(
    matchRoom,
    { playerName: 'SmokeIntruder', persistentId: newPersistentId() },
    'tournament room refuses a join without ticket'
  );
  assert.ok(TOURNAMENT_JOIN_REFUSALS.includes(refusal), 'Tournament room refuses a join without ticket');
  const status = await (await fetch(`${base}/parties/main/${matchRoom}`)).json();
  assert.equal(status.isAvailable, false, 'Tournament room is never available to casual players');
}

/** Protocol 2 (docs/server/protocol.md): opaque seat ids, secret tokens, no takeover by id. */
async function protocolTwoSeats() {
  const v2Room = `smoke-${randomUUID().slice(0, 8)}`;
  const dana = await connect('SmokeDana', newPersistentId(), { protocolVersion: 2 }, v2Room);
  await until(() => dana.session !== null, 'Protocol-2 seat receives its session');
  assert.equal(dana.session.playerId, dana.playerId, 'SESSION names the seat');
  assert.notEqual(dana.playerId, dana.persistentId, 'Protocol-2 seat ids are not browser ids');

  for (const proof of [dana.persistentId, dana.playerId]) {
    const refusal = await refusedJoin(
      v2Room,
      { playerName: 'SmokeMallory', persistentId: proof, protocolVersion: 2 },
      'a seat id or browser id alone takes no seat'
    );
    assert.ok(['SESSION_REJECTED', 'INVALID_PERSISTENT_ID'].includes(refusal), 'Seat takeover by id is refused');
  }

  dana.socket.close(1000, 'Reconnect smoke test');
  const back = await connect('SmokeDana', dana.persistentId, { protocolVersion: 2, sessionToken: dana.session.sessionToken }, v2Room);
  assert.equal(back.playerId, dana.playerId, 'The session token resumes the seat');
  assert.equal(back.state.players.length, 1, 'Resuming does not duplicate the seat');
}

async function command(client, input) {
  const revision = client.revision;
  client.socket.send(JSON.stringify({ requestId: randomUUID(), ...input }));
  await until(() => client.revision > revision, `${input.type} is acknowledged`);
}

try {
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const preflight = await fetch(`${base}/parties/main/${room}`, { method: 'OPTIONS' });
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  const availability = await fetch(`${base}/party/${room}`);
  assert.equal((await availability.json()).isAvailable, true, 'Legacy HTTP route works');

  const alice = await connect('SmokeAlice');
  const bob = await connect('SmokeBob');
  await connect('SmokeCarol');
  await until(() => clients.every((client) => client.state.players.length === 3), 'All players synchronize');
  await command(alice, { type: 'ADD_BOT', difficulty: 2 });
  await until(() => alice.state.players.length === 4, 'Bot joins');
  const bot = alice.state.players.find((player) => player.isBot);
  await command(alice, { type: 'REMOVE_BOT', botId: bot.id });
  await until(() => clients.every((client) => client.state.players.length === 3), 'Bot is removed');

  const start = { type: 'START_GAME', requestId: randomUUID() };
  await command(alice, start);
  alice.socket.send(JSON.stringify(start));
  await command(alice, { type: 'REQUEST_STATE' });
  assert.equal(alice.state.currentRound, 1, 'Retrying START_GAME does not start another round');
  // Bidding, card play and scoring are the golden path's (e2e/golden-path.spec.ts) and the
  // level-4 suite's (test/integration); this script checks the worker shape on the dealt round.
  await until(() => clients.every((client) => client.state.currentRound === 1), 'The deal synchronizes');
  const handOf = (client) => client.state.players.find((player) => player.id === client.playerId).hand.map((card) => card.id);
  for (const client of clients) {
    assert.equal(handOf(client).length, 1);
    assert.ok(client.state.players.filter((player) => player.id !== client.playerId)
      .every((player) => player.hand.every((card) => card.id === 'hidden')), 'Other hands remain private');
  }

  const bobHand = handOf(bob);
  bob.socket.close(1000, 'Reconnect smoke test');
  const reconnected = await connect('SmokeBob', bob.persistentId);
  assert.equal(reconnected.playerId, bob.playerId, 'Reconnect preserves player identity');
  assert.equal(reconnected.state.players.length, 3, 'Reconnect does not duplicate players');
  assert.deepEqual(handOf(reconnected), bobHand, 'Reconnect keeps the hand of the seat');
  const status = await (await fetch(`${base}/parties/main/${room}`)).json();
  assert.equal(status.playerCount, 3);
  await refusedTournamentJoin();
  await protocolTwoSeats();
  process.stdout.write(`${JSON.stringify({ status: 'passed', base, room, checks: [
    'health', 'CORS', 'legacy HTTP routing', 'three WebSocket clients', 'bot add/remove',
    'retry-safe start', 'private hands', 'reconnect', 'room status',
    'tournament room gate', 'protocol-2 seat tokens',
  ] }, null, 2)}\n`);
} finally {
  for (const client of clients) {
    if (client.socket.readyState === WebSocket.OPEN) client.socket.send(JSON.stringify({ type: 'LEAVE_GAME' }));
    client.socket.close(1000, 'Smoke test finished');
  }
}
