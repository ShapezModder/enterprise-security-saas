console.log('[WORKER] Process starting...');
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runEnterpriseScan, ScanOptions } from './scanner';
import { generateReport } from './reporter';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { startKeepAlive } from './keep-alive';

dotenv.config();

const prisma = new PrismaClient();

// Start keep-alive to prevent worker shutdown
startKeepAlive();

import http from 'http';

// connect to Redis


// connect to Redis
let redisConfig: any;
const redisUrl = process.env.REDIS_URL;

if (redisUrl && redisUrl.startsWith('redis')) {
  console.log(`[WORKER] Connecting to Redis using REDIS_URL`);
  redisConfig = redisUrl;
} else {
  console.error('[WORKER] ✗ REDIS_URL not found or invalid!');
  console.error('[WORKER] Please set REDIS_URL environment variable');
  if (redisUrl) {
    console.warn(`[WORKER] REDIS_URL is invalid (value: "${redisUrl.substring(0, 20)}..."), falling back to host/port config.`);
  }
  console.log(`[WORKER] Using fallback: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null
  };
}

const connection = new IORedis(redisConfig, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false
});
connection.on('error', (err) => {
  console.error('[WORKER] Redis Connection Error:', err.message || err);
});

// Create dummy HTTP server for Render Health Checks (Free Tier Requirement)
const port = process.env.PORT || 3002;
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Worker is running');
});
server.listen(port, () => {
  console.log(`[WORKER] Health check server listening on port ${port}`);
});

console.log("👷 WORKER: Online & waiting for scan jobs...");

const worker = new Worker(
  'enterprise-scan-queue',
  async job => {
    console.log(`[JOB START] Job ${job.data.jobId}`);

    try {
      // Update status -> RUNNING
      await prisma.job.update({
        where: { id: job.data.jobId },
        data: { status: 'RUNNING', startedAt: new Date() }
      });

      const jobId: string = job.data.jobId;
      const target: string = job.data.target;
      const authHeader: string | null = job.data.authHeader ?? null;

      // default options
      let options: ScanOptions = {
        aggressive: true,
        destructive: true,
        maxBulkTargets: 15
      };

      // override if provided
      if (job.data.options) {
        try {
          if (typeof job.data.options === "string") {
            options = { ...options, ...(JSON.parse(job.data.options) as Partial<ScanOptions>) };
          } else if (typeof job.data.options === "object") {
            options = { ...options, ...(job.data.options as Partial<ScanOptions>) };
          }
        } catch (e) {
          console.warn(`[JOB ${jobId}] Failed to parse options, using defaults`);
        }
      }

      console.log(`[JOB ${jobId}] Scan Options:`, options);

      // run scanner
      await runEnterpriseScan(jobId, target, authHeader, options);

      // write PDF report
      const reportPath = await generateReport(jobId);

      // update status -> COMPLETED
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          reportUrl: reportPath
        }
      });

      console.log(`[JOB DONE] ${jobId}`);

    } catch (err) {
      console.error(`[JOB FAILED]`, err);

      await prisma.job.update({
        where: { id: job.data.jobId },
        data: {
          status: 'FAILED'
        }
      });

      throw err;
    }
  },
  { connection }
);

// graceful shutdown
async function shutdown() {
  console.log("[WORKER] Shutting down...");
  try { await worker.close(); } catch { }
  try { await prisma.$disconnect(); } catch { }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
