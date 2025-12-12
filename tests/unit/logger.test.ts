import { describe, expect, test, vi } from 'vitest';
import { logger } from '@/lib/logger';

describe('logger', () => {
  test('info writes formatted string to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('phase-2 test', { step: 'info' });
    expect(spy).toHaveBeenCalled();
    const logged = spy.mock.calls[0][0] as string;
    expect(logged).toContain('[INFO]');
    expect(logged).toContain('phase-2 test');
    spy.mockRestore();
  });
});
