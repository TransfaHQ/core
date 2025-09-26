import { EntityProperty, Platform, Type } from '@mikro-orm/core';

export function tbIdToBuffer(tbId: bigint): Buffer {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(tbId >> 64n, 0); // high 64 bits
  buf.writeBigUInt64BE(tbId & ((1n << 64n) - 1n), 8); // low 64 bits
  return buf;
}

// Convert Buffer (from Postgres BYTEA) -> TigerBeetle bigint
export function bufferToTbId(buf: Buffer): bigint {
  const high = buf.readBigUInt64BE(0);
  const low = buf.readBigUInt64BE(8);
  return (high << 64n) | low;
}

export class TigerBeetleIdTransformer {
  to(data: bigint): Buffer {
    return tbIdToBuffer(data);
  }

  from(data: Buffer): bigint {
    return bufferToTbId(data);
  }
}

export class TigerBeetleIdType extends Type<bigint, Buffer> {
  convertToDatabaseValue(data: bigint, _: Platform): Buffer {
    return tbIdToBuffer(data);
  }

  convertToJSValue(data: Buffer, _: Platform): bigint {
    return bufferToTbId(data);
  }

  getColumnType(_: EntityProperty, __: Platform) {
    return `bytea`;
  }
}
