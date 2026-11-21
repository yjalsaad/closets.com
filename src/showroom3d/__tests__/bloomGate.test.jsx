import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { webcrypto } from 'crypto';
import BloomGate, { GATE, hashOf, isOpen } from '../BloomGate';

beforeAll(() => { if (!global.crypto || !global.crypto.subtle) Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true }); if (!global.TextEncoder) global.TextEncoder = require('util').TextEncoder; });
beforeEach(() => localStorage.clear());

test('only a salted hash is stored, and a wrong password does not match it', async () => {
  expect(GATE.hash).toMatch(/^[0-9a-f]{64}$/); expect(GATE.salt).toMatch(/^[0-9a-f]{32}$/); expect(GATE.rounds).toBeGreaterThanOrEqual(200000);
  expect(await hashOf('not the password')).not.toBe(GATE.hash);
});

test('the showroom stays hidden until the right password is entered, then stays open', async () => {
  const gate = { salt: '00112233445566778899aabbccddeeff', rounds: 1000 }; gate.hash = await hashOf('open sesame 42', gate);
  Object.assign(GATE, gate);
  render(<BloomGate><div data-testid="inside">showroom</div></BloomGate>);
  expect(screen.queryByTestId('inside')).toBeNull();
  fireEvent.change(screen.getByTestId('ybg-input'), { target: { value: 'wrong' } }); fireEvent.click(screen.getByTestId('ybg-go'));
  await screen.findByRole('alert'); expect(screen.queryByTestId('inside')).toBeNull(); expect(isOpen()).toBe(false);
  fireEvent.change(screen.getByTestId('ybg-input'), { target: { value: 'open sesame 42' } }); fireEvent.click(screen.getByTestId('ybg-go'));
  await waitFor(() => expect(screen.getByTestId('inside')).toBeTruthy()); expect(isOpen()).toBe(true);
  expect(isOpen(Date.now() + 13 * 3600e3)).toBe(false);
});
