import { initDb } from './index.js';

const seed = async () => {
  console.log('[DB Seed] Connecting to Neon PostgreSQL and initializing schema & seed data...');
  await initDb();
  console.log('[DB Seed] Seeding completed successfully!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('[DB Seed Error]', err);
  process.exit(1);
});
