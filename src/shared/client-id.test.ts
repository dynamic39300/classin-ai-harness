import { describe, expect, it } from 'vitest';
import { createClientId } from './client-id';

describe('createClientId', () => {
  it('uses randomUUID when the browser exposes it', () => {
    expect(createClientId('command', {
      randomUUID: () => '00000000-0000-4000-8000-000000000001',
    })).toBe('command-00000000-0000-4000-8000-000000000001');
  });

  it('creates a UUID-shaped id when randomUUID is unavailable on an HTTP LAN origin', () => {
    expect(createClientId('', {
      getRandomValues: (values) => {
        values.set(Array.from({ length: 16 }, (_, index) => index));
        return values;
      },
    })).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
  });
});
