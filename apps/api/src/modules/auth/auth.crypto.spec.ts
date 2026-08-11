import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

describe('Auth crypto helpers (unit)', () => {
  it('hashes and verifies passwords with bcrypt', async () => {
    const hash = await bcrypt.hash('Str0ngpass1', 12);
    expect(await bcrypt.compare('Str0ngpass1', hash)).toBe(true);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });

  it('hashes tokens with sha256 stably', () => {
    const a = createHash('sha256').update('token').digest('hex');
    const b = createHash('sha256').update('token').digest('hex');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
