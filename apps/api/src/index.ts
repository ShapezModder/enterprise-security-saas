// apps/api/src/index.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { sendDeclineEmail } from './email-helper';
dotenv.config();

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

// Socket.IO setup for live logs with Cloudflare compatibility
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    // CRITICAL: Use polling first to bypass Cloudflare WebSocket challenges
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    // Increase timeouts for slow/free-tier connections
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(express.json({ limit: '10mb' }));
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
app.use(cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    credentials: true
}));

// Redis / BullMQ setup
const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
let queue: Queue | null = null;
let redisConnection: any = null;

(async function initRedis() {
    try {
        if (REDIS_URL && REDIS_URL.startsWith('redis')) {
            console.log('[API] Connecting to Redis using REDIS_URL');
            redisConnection = new IORedis(REDIS_URL, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false, // Required for Upstash compatibility
                lazyConnect: false
            });
        } else {
            console.log(`[API] Connecting to Redis using host: ${REDIS_HOST}:${REDIS_PORT}`);
            redisConnection = new IORedis({
                host: REDIS_HOST,
                port: REDIS_PORT,
                maxRetriesPerRequest: null,
                enableReadyCheck: false
            });
        }
        await redisConnection.ping();
        queue = new Queue('enterprise-scan-queue', { connection: redisConnection });
        console.log('[API] ✓ Connected to Redis and Bull queue is ready');
    } catch (e) {
        console.error('[API] ✗ Redis connection failed:', String(e));
        console.error('[API] Jobs will be persisted to DB but NOT enqueued for processing');
        queue = null;
    }
})();

// Helper: ensure demo user exists (or create user with provided email)
async function ensureDemoUser(email: string = 'demo@local.invalid', name: string = 'Demo User') {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                email,
                passwordHash: '<<AUTO GENERATED - NOT FOR PRODUCTION>>',
                fullName: name,
                role: 'ADMIN'
            }
        });
        console.log('[API] Created user:', user.id, email);
    }
    return user;
}

// Basic URL validation
function isValidUrl(u: string) {
    try {
        if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'http://' + u;
        new URL(u);
        return true;
    } catch {
        return false;
    }
}

// POST /api/scan --> create job (but DON'T auto-queue)
app.post('/api/scan', async (req: Request, res: Response) => {
    try {
        const targetRaw = String(req.body.target || '').trim();
        if (!targetRaw) return res.status(400).json({ error: 'target is required' });
        if (!isValidUrl(targetRaw)) return res.status(400).json({ error: 'target is not a valid URL or hostname' });

        const scanProfile = req.body.scanProfile || 'balanced';
        const authHeader = req.body.authHeader ?? null;
        const scope = req.body.scope ?? {};
        const options = req.body.options ?? {};
        const consentDocument = req.body.consentDocument ?? null;
        const email = req.body.email || 'demo@example.com';
        const company = req.body.company || email.split('@')[0];

        if (options.destructive && !consentDocument) {
            return res.status(400).json({ error: 'Destructive scans require a consentDocument (signed SoW).' });
        }

        // Create or find user with the provided email
        const dbUser = await ensureDemoUser(email, company);

        const jobId = uuidv4();

        // Create job in DB but DON'T queue to BullMQ yet
        const job = await prisma.job.create({
            data: {
                id: jobId,
                userId: dbUser.id,
                target: targetRaw,
                scope: scope,
                status: 'QUEUED', // Stays QUEUED until admin manually starts
                scanProfile: scanProfile,
                authHeader: authHeader,
                options: options,
                consentDocument: consentDocument
            }
        });

        console.log(`[API] Job ${jobId} created and QUEUED (waiting for admin approval)`);

        return res.status(201).json({
            jobId: job.id,
            status: job.status,
            message: 'Job queued successfully. Awaiting partner approval to start scan.'
        });
    } catch (e: any) {
        console.error('[API ERROR]', e);
        if (e?.code === 'P2003') {
            return res.status(500).json({ error: 'Database foreign key error creating job. Ensure user exists.' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// NEW: Admin endpoint to manually start a queued job
app.post('/api/admin/start-job', async (req: Request, res: Response) => {
    try {
        const { jobId, selectedStages, destructive } = req.body;

        if (!jobId) {
            return res.status(400).json({ error: 'jobId required' });
        }

        const job = await prisma.job.findUnique({ where: { id: jobId } });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.status !== 'QUEUED') {
            return res.status(400).json({ error: `Job is already ${job.status}` });
        }

        // Merge options with destructive setting
        const currentOptions = (job.options as any) || {};
        const updatedOptions = {
            ...currentOptions,
            destructive: destructive ?? currentOptions.destructive ?? false
        };

        // NOW queue it to BullMQ for processing
        if (queue) {
            // Update job status to RUNNING and store selected stages
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'RUNNING',
                    startedAt: new Date(),
                    selectedStages: selectedStages || null,
                    options: updatedOptions
                }
            });

            await queue.add('run-scan', {
                jobId: job.id,
                target: job.target,
                authHeader: job.authHeader,
                options: updatedOptions
            });
            console.log(`[API] Job ${jobId} started with ${selectedStages?.length || 'all'} stages, destructive: ${updatedOptions.destructive}`);
        } else {
            return res.status(500).json({ error: 'Queue not available' });
        }

        return res.json({ success: true, message: 'Job started successfully' });
    } catch (e: any) {
        console.error('[API ERROR]', e);
        return res.status(500).json({ error: 'Failed to start job' });
    }
});

// NEW: Get all jobs (for admin dashboard)
app.get('/api/admin/jobs', async (req: Request, res: Response) => {
    try {
        const jobs = await prisma.job.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                user: {
                    select: { email: true }
                },
                findings: {
                    select: { severity: true }
                }
            }
        });

        return res.json({ jobs });
    } catch (e: any) {
        console.error('[API ERROR]', e);
        return res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// NEW: Admin endpoint to decline a pending job
app.post('/api/admin/decline-job', async (req: Request, res: Response) => {
    try {
        const { jobId, reason } = req.body;

        if (!jobId) {
            return res.status(400).json({ error: 'jobId required' });
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { user: true }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.status !== 'QUEUED') {
            return res.status(400).json({ error: `Job is already ${job.status}` });
        }

        // Update job status to DECLINED
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'DECLINED',
                errorMessage: reason || 'Request declined by administrator'
            }
        });

        console.log(`[API] Job ${jobId} declined by admin. Notifying user...`);

        // Send decline notification email
        try {
            await sendDeclineEmail(job.user.email, job.target, reason);
        } catch (emailError) {
            console.error(`[API] Email sending failed, but continuing:`, emailError);
            // Don't fail the API request if email fails
        }

        return res.json({ success: true, message: 'Job declined successfully', userEmail: job.user.email, target: job.target, reason });
    } catch (e: any) {
        console.error('[API ERROR]', e);
        return res.status(500).json({ error: 'Failed to decline job' });
    }
});

// NEW: Admin endpoint to terminate a running job
app.post('/api/admin/terminate-job', async (req: Request, res: Response) => {
    try {
        const { jobId } = req.body;

        if (!jobId) {
            return res.status(400).json({ error: 'jobId required' });
        }

        const job = await prisma.job.findUnique({ where: { id: jobId } });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.status !== 'RUNNING') {
            return res.status(400).json({ error: `Job is not running (status: ${job.status})` });
        }

        // Update status to CANCELLED (worker will detect this and stop)
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'CANCELLED',
                completedAt: new Date(),
                errorMessage: 'Terminated by administrator'
            }
        });

        console.log(`[API] Job ${jobId} terminated by admin`);

        return res.json({ success: true, message: 'Job terminated successfully' });
    } catch (e: any) {
        console.error('[API ERROR]', e);
        return res.status(500).json({ error: 'Failed to terminate job' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Socket.IO connection handler for live logs
io.on('connection', (socket) => {
    console.log('[SOCKET.IO] Client connected:', socket.id);

    socket.on('subscribe_job', (jobId: string) => {
        console.log(`[SOCKET.IO] Client subscribed to job: ${jobId}`);
        socket.join(`job-${jobId}`);
    });

    // Receive logs from worker and broadcast to admin
    socket.on('scan_log', (data: { jobId: string; log: string }) => {
        console.log(`[LOG] ${data.jobId}: ${data.log}`);
        io.to(`job-${data.jobId}`).emit('scan_log', data);
    });

    socket.on('disconnect', () => {
        console.log('[SOCKET.IO] Client disconnected:', socket.id);
    });
});

// Start server with Socket.IO support
const PORT = Number(process.env.PORT || 3001);
httpServer.listen(PORT, () => {
    console.log(`[API] Server listening on http://localhost:${PORT}`);
    console.log(`[SOCKET.IO] WebSocket server ready`);
});
