import 'dotenv/config';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;

// Initialize the pg pool with your pooled connection string
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Pass the pool to the Prisma adapter
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });