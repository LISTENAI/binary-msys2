import { isAbsolute } from 'path';
import binary from '../src';

test('homeDir', () => {
  expect(isAbsolute(binary.homeDir)).toBe(true);
});

test('binaryDir', () => {
  expect(isAbsolute(binary.binaryDir)).toBe(true);
});

test('version()', async () => {
  expect(await binary.version()).toBeTruthy();
});
