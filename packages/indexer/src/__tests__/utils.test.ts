import { normalizeTableHeader, parseEnumValues, normalizeComponentTag } from '@antdv-mcp/shared';

describe('normalizeTableHeader', () => {
  it('should normalize Chinese headers', () => {
    expect(normalizeTableHeader('参数')).toBe('name');
    expect(normalizeTableHeader('说明')).toBe('description');
    expect(normalizeTableHeader('类型')).toBe('type');
    expect(normalizeTableHeader('默认值')).toBe('default');
  });

  it('should normalize English headers', () => {
    expect(normalizeTableHeader('Property')).toBe('name');
    expect(normalizeTableHeader('Description')).toBe('description');
    expect(normalizeTableHeader('Type')).toBe('type');
    expect(normalizeTableHeader('Default')).toBe('default');
  });

  it('should handle case variations', () => {
    expect(normalizeTableHeader('NAME')).toBe('name');
    expect(normalizeTableHeader('Name')).toBe('name');
    expect(normalizeTableHeader('name')).toBe('name');
  });
});

describe('parseEnumValues', () => {
  it('should extract values from union types with single quotes', () => {
    const values = parseEnumValues("'small' | 'middle' | 'large'");
    expect(values).toEqual(['small', 'middle', 'large']);
  });

  it('should extract values from union types with double quotes', () => {
    const values = parseEnumValues('"primary" | "secondary" | "tertiary"');
    expect(values).toEqual(['primary', 'secondary', 'tertiary']);
  });

  it('should handle mixed quotes', () => {
    const values = parseEnumValues("'left' | \"right\" | 'center'");
    expect(values).toEqual(['left', 'right', 'center']);
  });

  it('should return empty array for non-union types', () => {
    expect(parseEnumValues('string')).toEqual([]);
    expect(parseEnumValues('number')).toEqual([]);
    expect(parseEnumValues('')).toEqual([]);
  });
});

describe('normalizeComponentTag', () => {
  it('should normalize component names to tag format', () => {
    expect(normalizeComponentTag('button')).toBe('a-button');
    expect(normalizeComponentTag('Button')).toBe('a-button');
    expect(normalizeComponentTag('BUTTON')).toBe('a-button');
  });

  it('should handle names that already have a- prefix', () => {
    expect(normalizeComponentTag('a-button')).toBe('a-button');
    expect(normalizeComponentTag('A-Button')).toBe('a-button');
  });

  it('should handle names starting with a but no dash', () => {
    expect(normalizeComponentTag('affix')).toBe('a-ffix');
    expect(normalizeComponentTag('alert')).toBe('a-lert');
  });
});
