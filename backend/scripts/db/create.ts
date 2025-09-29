import { execSync } from 'child_process';
import path from 'path';

async function createMigrationFile() {
  const name = process.argv[2] ?? 'Migration';

  try {
    const configPath = path.join(__dirname, 'typeorm.config.ts');

    // Use TypeORM CLI to generate migration
    const command = `npx typeorm-ts-node-commonjs migration:generate ../../src/database/typeorm-migrations/${Date.now()}-${name} -d ${configPath}`;

    console.log('Creating migration with TypeORM CLI...');
    execSync(command, {
      stdio: 'inherit',
      cwd: __dirname,
    });

    console.log(`✨ Created migration: ${name}`);
  } catch (error) {
    console.error('❌ Failed to create migration:', error);
    process.exit(1);
  }
}

createMigrationFile();
