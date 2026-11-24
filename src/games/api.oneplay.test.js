// [IKG-ONE-PLAY 2026-11-24] one game per mobile number: after the first play every game is closed (demo mirrors the server rule)
beforeAll(() => { window.history.pushState({}, '', '/ikhtarha/games?demo=1'); });
test('demo: the first play closes all six games and a second play is refused as already_played', async () => {
  const api = require('./api');
  expect(api.DEMO).toBe(true);
  let st = await api.state('demo');
  expect(st.games.every((g) => g.state === 'available')).toBe(true); expect(st.already).toBeNull();
  const first = await api.play('demo', 'spin-win');
  expect(first.ok).toBe(true);
  expect(first.games.every((g) => g.state === 'played')).toBe(true);
  const second = await api.play('demo', 'scratch-win');
  expect(second).toMatchObject({ ok: false, state: 'already_played' });
  expect(second.last.game).toBe('spin-win');
  st = await api.state('demo'); expect(st.already.game).toBe('spin-win');
});
