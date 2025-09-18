export class SnowflakeId {
  private readonly epoch: bigint;
  private sequence: bigint = 0n;
  private lastTimestamp: bigint = -1n;

  constructor(
    private readonly workerId: bigint,
    epoch: bigint = 1758153600000n, // 2025-09-18,
  ) {
    if (workerId < 0n || workerId > 1023n) {
      throw new Error('workerId must be between 0 and 1023');
    }
    this.epoch = epoch;
  }

  private currentTime(): bigint {
    return BigInt(Date.now());
  }

  private waitNextMillis(lastTimestamp: bigint): bigint {
    let ts = this.currentTime();
    while (ts <= lastTimestamp) {
      ts = this.currentTime();
    }
    return ts;
  }

  static generate(): bigint {
    const generator = new SnowflakeId(1n);

    let ts = generator.currentTime();

    if (ts < generator.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate id');
    }

    if (ts === generator.lastTimestamp) {
      generator.sequence = (generator.sequence + 1n) & 0xfffn;
      if (generator.sequence === 0n) {
        ts = generator.waitNextMillis(generator.lastTimestamp);
      }
    } else {
      generator.sequence = 0n;
    }

    generator.lastTimestamp = ts;

    const timestampPart = (ts - generator.epoch) << 22n;
    const workerPart = (generator.workerId & 0x3ffn) << 12n;
    const sequencePart = generator.sequence & 0xfffn;

    return timestampPart | workerPart | sequencePart;
  }

  public extractTimestamp(id: bigint): number {
    return Number((id >> 22n) + this.epoch);
  }
}
