import { INestApplication } from '@nestjs/common';

declare global {
  // Declare a global variable so TypeScript knows about it
  var __TEST_APP__: INestApplication | undefined;

  var __TEST_CORE_API_KEY__: string | undefined;
  var __TEST_CORE_API_SECRET__: string | undefined;

  var __TEST_LEDGER_ID__: string | undefined;
}

export {};
