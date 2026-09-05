import { describe, expect, test } from 'bun:test';
import { rewriteClassValue, summarizeChanges, uniqueTokens } from '../src/candidates.js';

describe('uniqueTokens', () => {
  test('splits on whitespace and de-duplicates in order', () => {
    expect(uniqueTokens('  flex  mt-[16px]\nflex\tp-4 ')).toEqual(['flex', 'mt-[16px]', 'p-4']);
  });

  test('empty and whitespace-only strings yield no tokens', () => {
    expect(uniqueTokens('')).toEqual([]);
    expect(uniqueTokens('   \n\t ')).toEqual([]);
  });
});

describe('rewriteClassValue', () => {
  test('replaces only non-canonical spellings, preserving separators', () => {
    const canonicalOf = new Map([
      ['mt-[16px]', 'mt-4'],
      ['flex', 'flex'],
    ]);
    const { fixed, changes } = rewriteClassValue('mt-[16px]  flex\nmt-[16px]', canonicalOf);
    expect(fixed).toBe('mt-4  flex\nmt-4');
    expect(changes).toEqual([
      { original: 'mt-[16px]', canonical: 'mt-4' },
      { original: 'mt-[16px]', canonical: 'mt-4' },
    ]);
  });

  test('unknown tokens pass through untouched', () => {
    const { fixed, changes } = rewriteClassValue('my-custom-class flex', new Map());
    expect(fixed).toBe('my-custom-class flex');
    expect(changes).toEqual([]);
  });

  test('no changes when everything is already canonical', () => {
    const { fixed, changes } = rewriteClassValue(
      'flex p-4',
      new Map([
        ['flex', 'flex'],
        ['p-4', 'p-4'],
      ])
    );
    expect(fixed).toBe('flex p-4');
    expect(changes).toEqual([]);
  });
});

describe('summarizeChanges', () => {
  test('single change has no suffix', () => {
    expect(summarizeChanges([{ original: 'a', canonical: 'b' }])).toEqual({
      original: 'a',
      canonical: 'b',
      suffix: '',
    });
  });

  test('multiple changes count the remainder', () => {
    expect(
      summarizeChanges([
        { original: 'a', canonical: 'b' },
        { original: 'c', canonical: 'd' },
        { original: 'e', canonical: 'f' },
      ])
    ).toEqual({ original: 'a', canonical: 'b', suffix: ' (+2 more in this string)' });
  });
});
