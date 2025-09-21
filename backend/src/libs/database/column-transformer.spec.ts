import { ColumnNumericTransformer } from './column-transformer';

describe('ColumnNumericTransformer', () => {
  let transformer: ColumnNumericTransformer;

  beforeEach(() => {
    transformer = new ColumnNumericTransformer();
  });

  it('should parse number to number', () => {
    expect(transformer.to(10)).toBe(10);
    expect(transformer.to(10.5)).toBe(10.5);
  });

  it('should parse string to number', () => {
    expect(transformer.from('10')).toBe(10);
    expect(transformer.from('10.5')).toBe(10.5);
  });
});
