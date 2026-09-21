import {sql} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { acquireDatabaseLock } from './localLock';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleLocal } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { migrate as migratePostgres } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const externalDatabase = !!(process.env.DATABASE_URL || process.env.SQL_HOST);
if(process.env.RAILWAY_ENVIRONMENT && !externalDatabase)throw Error('Railway requires DATABASE_URL. Refusing to start with an ephemeral local database.');
if (!externalDatabase) mkdirSync('./data', { recursive: true });
const releaseLocalLock = !externalDatabase && process.env.LOCAL_DB_DIR !== ':memory:' ? acquireDatabaseLock(process.env.LOCAL_DB_DIR || './data/arena') : () => {};
export const localClient = externalDatabase ? undefined : new PGlite(process.env.LOCAL_DB_DIR === ':memory:' ? undefined : process.env.LOCAL_DB_DIR || './data/arena');
export const db = localClient
  ? drizzleLocal(localClient, { schema })
  : drizzle(createPool(), { schema });

export async function initializeDatabase() {
  if (localClient) {
    await migrate(drizzleLocal(localClient), { migrationsFolder: './drizzle' });
  } else {
    await migratePostgres(db as ReturnType<typeof drizzle>, { migrationsFolder: './drizzle' });
  }
  await db.execute(sql`ALTER TABLE players ALTER COLUMN current_injury TYPE double precision`);
  await db.execute(sql`ALTER TABLE clubs ALTER COLUMN merit TYPE double precision`);
}

export async function withInitializationLock(fn:()=>Promise<void>){
  if(localClient)return fn();
  const client=await createPool().connect();
  try{await client.query('SELECT pg_advisory_lock(719201)');await fn();}
  finally{await client.query('SELECT pg_advisory_unlock(719201)');client.release();}
}

export async function closeDatabase(){ if(localClient) await localClient.close(); else await global._postgresPool?.end(); releaseLocalLock(); }
