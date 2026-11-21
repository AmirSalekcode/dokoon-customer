import { describe, expect, it } from 'vitest';
import { buildXlsx, columnName, crc32, zipStore } from './xlsx';

/** Test-side ZIP reader (stored entries only), checking every CRC like a real unzip would. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder();
  // End of central directory: last 22 bytes (no comment).
  const eocd = bytes.length - 22;
  expect(v.getUint32(eocd, true)).toBe(0x06054b50);
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const crc = v.getUint32(p + 16, true);
    const size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    expect(v.getUint32(local, true)).toBe(0x04034b50);
    expect(v.getUint16(local + 8, true)).toBe(0); // stored
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    expect(crc32(data), name).toBe(crc);
    out.set(name, dec.decode(data));
    p += 46 + nameLen;
  }
  return out;
}

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const wellFormed = (s: string) => xml(s).getElementsByTagName('parsererror').length === 0;

// KAN-75: accounting export of settlements.
describe('crc32 / zip', () => {
  it('matches the standard CRC-32 check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('round-trips files with UTF-8 names', () => {
    const files = unzip(zipStore([{ name: 'a/ب.txt', data: new TextEncoder().encode('سلام') }]));
    expect(files.get('a/ب.txt')).toBe('سلام');
  });
});

describe('columnName', () => {
  it('A…Z, AA', () => {
    expect([0, 1, 25, 26, 27, 701, 702].map(columnName)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  });
});

describe('buildXlsx', () => {
  const book = () =>
    unzip(
      buildXlsx([
        {
          name: 'تسویه‌ها',
          widths: [20, 16],
          rows: [
            ['دوره', 'قابل واریز (تومان)', 'کمیسیون ٪'],
            ['هفته‌ی ۱ <آذر> & "ب"', 1234567, 12.5],
            ['خالی', null, undefined],
          ],
        },
        { name: 'bad:/name?', rows: [['x']], rtl: false },
      ]),
    );

  it('contains the parts Excel needs, all well-formed', () => {
    const f = book();
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]) {
      expect(f.has(part), part).toBe(true);
      expect(wellFormed(f.get(part)!), part).toBe(true);
    }
  });

  it('is right-to-left with a frozen bold header and column widths', () => {
    const s = book().get('xl/worksheets/sheet1.xml')!;
    expect(s).toContain('rightToLeft="1"');
    expect(s).toContain('state="frozen"');
    expect(s).toContain('<col min="1" max="1" width="20" customWidth="1"/>');
    expect(s).toMatch(/<c r="A1" t="inlineStr" s="1">/);
    expect(book().get('xl/worksheets/sheet2.xml')).not.toContain('rightToLeft');
  });

  it('writes money as real numbers (summable) and escapes text', () => {
    const s = book().get('xl/worksheets/sheet1.xml')!;
    expect(s).toContain('<c r="B2" s="2"><v>1234567</v></c>');
    expect(s).toContain('<c r="C2" s="3"><v>12.5</v></c>');
    const doc = xml(s);
    expect(doc.getElementsByTagName('t')[3].textContent).toBe('هفته‌ی ۱ <آذر> & "ب"');
    // Empty cells are left out.
    expect(s).not.toContain('r="B3"');
  });

  it('sanitises sheet names', () => {
    const w = book().get('xl/workbook.xml')!;
    expect(w).toContain('name="تسویه‌ها"');
    expect(w).toContain('name="bad  name"');
  });

  it('is deterministic', () => {
    const a = buildXlsx([{ name: 's', rows: [['a', 1]] }]);
    const b = buildXlsx([{ name: 's', rows: [['a', 1]] }]);
    expect(a).toEqual(b);
  });
});
