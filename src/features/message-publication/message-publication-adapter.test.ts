import { describe, expect, it } from 'vitest';
import { createFixedMessagePublicationAdapter } from './message-publication-adapter';

describe('fixed message publication adapter', () => {
  it('returns isolated snapshots and resets to the fixed source', () => {
    const adapter = createFixedMessagePublicationAdapter();
    const first = adapter.getSnapshot();
    const second = adapter.getSnapshot();
    expect(second).not.toBe(first);
    expect(second.officialContents.map(({ topic }) => topic)).toEqual(['getting-started', 'product-update', 'help']);
    expect(adapter.reset()).toEqual(second);
  });
});
