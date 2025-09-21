import { id } from 'tigerbeetle-node';

import { TigerBeetleIdTransformer, tbIdToBuffer } from './column-transformer';

describe('TigerBeetleIdTransformer', () => {
  let transformer: TigerBeetleIdTransformer;
  let tbId: bigint;

  beforeEach(() => {
    transformer = new TigerBeetleIdTransformer();
    tbId = id();
  });

  it('should parse bigint to bytea', () => {
    expect(transformer.to(tbId)).toEqual(tbIdToBuffer(tbId));
  });

  it('should parse bytea to int', () => {
    const buff = tbIdToBuffer(tbId);
    expect(transformer.from(buff)).toBe(tbId);
  });
});
