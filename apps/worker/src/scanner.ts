import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import {
    runXSSScanning,
    runXXEScanning,
    runSSRFScanning,
    runDeserializationScanning,
    runBusinessLogicTesting,
    runCloudSecurityScanning,
    runAuthenticationTesting
} from './advanced-scanner';
import { getCVSSForVulnerability } from './cvss-calculator';
import { io as ioClient } from 'socket.io-client';
import { generateReport } from './reporter';
import { sendReportEmail } from './email-service';

const prisma = new PrismaClient();
const OUTPUT_DIR = path.join(process.cwd(), 'scans');
const WORDLIST_URL = 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt';

const WP_DETECTION_KEYWORDS = ['wp-content', 'wp-login.php', 'wordpress'];

// Socket.IO client for streaming logs to admin dashboard
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';
console.log(`[WORKER] Raw API_URL: '${rawApiUrl}'`);

let apiUrl = rawApiUrl;
if (apiUrl.startsWith('/') && !apiUrl.startsWith('//')) {
    console.warn(`[WORKER] API_URL starts with '/', which is invalid for Node.js worker. Falling back to http://localhost:3001`);
    apiUrl = 'http://localhost:3001';
}

const socket = ioClient(apiUrl, {
    transports: ['polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000
});

let lastErrorLog = 0;
socket.on('connect_error', (err) => {
    const now = Date.now();
    if (!lastErrorLog || now - lastErrorLog > 60000) {
        console.error(`[SCANNER] Socket.IO Connection Error (URL: ${apiUrl}):`, err.message || err);
        lastErrorLog = now;
    }
});

socket.on('connect', () => {
    console.log('[SCANNER] Connected to API for log streaming');
});

socket.on('disconnect', () => {
    console.log('[SCANNER] Disconnected from API');
});

export interface ScanOptions {
    aggressive?: boolean;
    destructive?: boolean;
    maxBulkTargets?: number;
}

// --- HELPER: LOGGING with Socket.IO ---
const log = (msg: string, jobId?: string) => {
    console.log(msg);
    if (jobId && socket.connected) {
        socket.emit('scan_log', { jobId, log: msg });
    }
};

// --- UTILITIES ---

function runCommand(cmd: string): Promise<string> {
    return new Promise((resolve) => {
        exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
            resolve(stdout || stderr);
        });
    });
}

function safeReadFile(filePath: string): string {
    try { return fs.readFileSync(filePath, 'utf-8'); }
    catch { return ''; }
}

// Download wordlist for FFUF if not exists
async function ensureWordlist(jobId?: string): Promise<string> {
    const wordlistPath = path.join(OUTPUT_DIR, 'common.txt');
    if (!fs.existsSync(wordlistPath)) {
        log('[SETUP] Downloading FFUF wordlist...', jobId);
        await runCommand(`wget -q ${WORDLIST_URL} -O ${wordlistPath}`);
    }
    return wordlistPath;
}

async function ensureNotCancelled(jobId: string) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (job && (job as any).status === 'CANCELLED') {
        throw new Error('Scan cancelled by user');
    }
}

async function saveFinding(
    jobId: string,
    category: string,
    title: string,
    severity: string,
    desc: string,
    evidence: string,
    remediation: string
) {
    const exists = await prisma.finding.findFirst({ where: { jobId, title: `[${category}] ${title}` } });
    if (exists) return;

    await prisma.finding.create({
        data: {
            jobId,
            title: `[${category}] ${title}`,
            severity: severity.toUpperCase() as any,
            description: desc.substring(0, 1000),
            evidence: evidence.substring(0, 2000),
            remediation
        }
    });
}

async function saveBatchFindings(jobId: string, findings: any[], category: string) {
    for (const f of findings) {
        await saveFinding(jobId, category, f.title, f.severity, f.description, f.evidence, f.remediation);
    }
}

// --- PARSERS ---

function parseFfufOutput(jsonString: string) {
    const findings: any[] = [];
    if (!jsonString.trim()) return findings;
    try {
        const data = JSON.parse(jsonString);
        if (data.results) {
            for (const res of data.results) {
                if (res.status === 403 || res.status === 429) continue;
                findings.push({
                    title: `Hidden Asset: /${res.input.FUZZ}`,
                    severity: 'medium',
                    description: `Hidden path found: ${res.url} (Status: ${res.status}).`,
                    evidence: `Status: ${res.status}\\nURL: ${res.url}`,
                    remediation: 'Ensure this path is intended to be public.'
                });
            }
        }
    } catch { /* ignore parse errors */ }
    return findings;
}

function parseNucleiOutput(output: string) {
    const findings: any[] = [];
    if (!output.trim()) return findings;
    const lines = output.split('\\n');
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            if (data.info?.severity === 'info' && !data.info?.name?.includes('Tech')) continue;
            findings.push({
                title: data.info?.name || data.template_id,
                severity: (data.info?.severity || 'medium').toLowerCase(),
                description: `Vulnerability: ${data.type}. ${data.info?.description || ''}`,
                evidence: `Matched: ${data.matched_at}`,
                remediation: 'Apply vendor patch or configuration hardening as per template guidance.'
            });
        } catch { /* ignore */ }
    }
    return findings;
}

function parseNmapOutput(output: string) {
    const findings: any[] = [];
    if (!output.trim()) return findings;
    const lines = output.split('\\n');
    for (const line of lines) {
        const match = line.match(/^(\d+\/\w+)\s+open\s+(\S+)\s*(.*)?$/);
        if (match) {
            findings.push({
                title: `Exposed Service: ${match[1]} (${match[2]})`,
                severity: 'info',
                description: `Port ${match[1]} is exposed. Service: ${match[3] || 'Unknown'}.`,
                evidence: line,
                remediation: 'Confirm business need for this service and restrict exposure where possible.'
            });
        }
    }
    return findings;
}

function parseSslOutput(jsonString: string) {
    const findings: any[] = [];
    if (!jsonString.trim()) return findings;
    try {
        const data = JSON.parse(jsonString);
        const results = Array.isArray(data) ? data : [data];
        for (const res of results) {
            if (res.severity && (res.severity === 'HIGH' || res.severity === 'CRITICAL')) {
                findings.push({
                    title: `SSL/TLS Weakness: ${res.id}`,
                    severity: res.severity.toLowerCase(),
                    description: `Cryptographic flaw detected: ${res.finding}.`,
                    evidence: `CWE: ${res.cwe || 'N/A'}`,
                    remediation: 'Disable weak ciphers and follow modern TLS best practices.'
                });
            }
        }
    } catch { /* ignore */ }
    return findings;
}

// --- MAIN SCAN PIPELINE ---

export const runEnterpriseScan = async (
    jobId: string,
    primaryDomain: string,
    authHeader: string | null,
    options: ScanOptions = {}
) => {
    const aggressive = options.aggressive ?? true;
    const destructive = options.destructive ?? true;

    log(`[CYBER WARFARE] Initiating Security Assessment for ${primaryDomain}...`, jobId);
    log(`[CONFIG] Aggressive: ${aggressive}, Destructive: ${destructive}`, jobId);

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const targetUrl = primaryDomain.startsWith('http') ? primaryDomain : `https://${primaryDomain}`;

    // Fetch job to get selected stages
    const job = await prisma.job.findUnique({
        where: { id: jobId }
    });

    const selectedStages = (job?.selectedStages as string[]) || [];
    const runAllStages = selectedStages.length === 0;

    // Helper to check if stage should run
    const shouldRun = (stageId: string) => {
        if (runAllStages) return true;
        return selectedStages.includes(stageId);
    };

    if (runAllStages) {
        log('[CONFIG] Running ALL stages (no selection made)', jobId);
    } else {
        log(`[CONFIG] Running ${selectedStages.length} selected stages: ${selectedStages.join(', ')}`, jobId);
    }

    // --- STAGE 0: WAF FINGERPRINTING ---
    if (shouldRun('waf-detection')) {
        await ensureNotCancelled(jobId);
        log('[STAGE 0] WAF Fingerprinting (wafw00f)...', jobId);
        try {
            const wafOut = await runCommand(`wafw00f ${targetUrl}`);
            if (wafOut.toLowerCase().includes('cloudflare') || wafOut.toLowerCase().includes('akamai')) {
                await saveFinding(jobId, 'WAF', 'WAF Detected', 'info', `WAF detected: ${wafOut.substring(0, 200)}`, wafOut.substring(0, 500), 'WAF is active. Adjust scan intensity accordingly.');
            }
        } catch (e) {
            log(`[WARN] WAF scan failed: ${String(e)}`, jobId);
        }
    } else {
        log('[STAGE 0] WAF Detection - SKIPPED', jobId);
    }

    // --- STAGE 1: TECH STACK DETECTION ---
    if (shouldRun('tech-stack')) {
        await ensureNotCancelled(jobId);
        log('[STAGE 1] Tech Stack Detection (WhatWeb)...', jobId);
        try {
            const wwOut = await runCommand(`whatweb ${targetUrl}`);
            if (wwOut) {
                await saveFinding(jobId, 'Recon', 'Technology Stack', 'info', `Detected technologies: ${wwOut.substring(0, 300)}`, wwOut.substring(0, 1000), 'Review exposed technology versions for known vulnerabilities.');
            }
        } catch (e) {
            log(`[WARN] WhatWeb scan failed: ${String(e)}`, jobId);
        }
    } else {
        log('[STAGE 1] Tech Stack Detection - SKIPPED', jobId);
    }

    // --- STAGE 2: SUBDOMAIN ENUMERATION ---
    let subdomains: string[] = [];
    if (shouldRun('subdomain-enum')) {
        await ensureNotCancelled(jobId);
        log('[STAGE 2] Subdomain Enumeration (subfinder)...', jobId);
        try {
            const subFile = path.join(OUTPUT_DIR, `subdomains-${jobId}.txt`);
            await runCommand(`subfinder -d ${primaryDomain} -o ${subFile} -silent`);
            const subData = safeReadFile(subFile);
            subdomains = subData.split('\\n').filter(s => s.trim());
            log(`[RECON] Found ${subdomains.length} subdomains`, jobId);
        } catch (e) {
            log(`[WARN] Subfinder failed: ${String(e)}`, jobId);
        }
    } else {
        log('[STAGE 2] Subdomain Enumeration - SKIPPED', jobId);
    }

    // --- STAGE 3: DEEP WEB CRAWLING ---
    let crawlData = '';
    if (shouldRun('web-crawling')) {
        await ensureNotCancelled(jobId);
        log('[STAGE 3] Deep Web Crawling (Katana)...', jobId);
        try {
            const crawlFile = path.join(OUTPUT_DIR, `crawl-${jobId}.txt`);
            // Reduced depth and added timeout to prevent hanging
            const depth = aggressive ? 3 : 2; // Reduced from 5/3 to 3/2
            await runCommand(`katana -u ${targetUrl} -d ${depth} -o ${crawlFile} -silent -timeout 60`);
            crawlData = safeReadFile(crawlFile);
            const urlCount = crawlData.split('\\n').filter(u => u.trim()).length;
            log(`[CRAWL] Discovered ${urlCount} URLs`, jobId);
        } catch (e) {
            log(`[WARN] Katana failed or timed out: ${String(e)}`, jobId);
            log('[INFO] Continuing scan without crawl data', jobId);
            crawlData = '';
        }
    } else {
        log('[STAGE 3] Deep Web Crawling - SKIPPED (Katana disabled)', jobId);
    }

    // --- STAGE 4: DIRECTORY FUZZING ---
    if (shouldRun('directory-fuzzing')) {
        await ensureNotCancelled(jobId);
        log('[STAGE 4] Directory Fuzzing (FFUF)...', jobId);
        try {
            const wordlistPath = await ensureWordlist(jobId);
            const ffufFile = path.join(OUTPUT_DIR, `ffuf-${jobId}.json`);
            await runCommand(`ffuf -u ${targetUrl}/FUZZ -w ${wordlistPath} -o ${ffufFile} -of json -mc 200,301,302,403 -fc 404 -t ${aggressive ? 50 : 20} -s`);
            const ffufData = safeReadFile(ffufFile);
            const ffufFindings = parseFfufOutput(ffufData);
            await saveBatchFindings(jobId, ffufFindings, 'Fuzzing');
        } catch (e) {
            log(`[WARN] FFUF failed: ${String(e)}`, jobId);
        }
    } else {
        log('[STAGE 4] Directory Fuzzing - SKIPPED', jobId);
    }

    // --- STAGE 5: SSL/TLS ASSESSMENT ---
    if (shouldRun('ssl-assessment')) {
        await ensureNotCancelled(jobId);
        log('[STAGE 5] SSL/TLS Assessment (testssl.sh)...', jobId);
        try {
            const sslFile = path.join(OUTPUT_DIR, `ssl-${jobId}.json`);
            await runCommand(`testssl --jsonfile-pretty ${sslFile} ${targetUrl} 2>/dev/null || true`);
            const sslOut = safeReadFile(sslFile);
            const sslFindings = parseSslOutput(sslOut);
            await saveBatchFindings(jobId, sslFindings, 'SSL/TLS');
        } catch (e) {
            log(`[WARN] testssl.sh failed: ${String(e)}`, jobId);
        }
    } else {
        log('[STAGE 5] SSL/TLS Assessment - SKIPPED', jobId);
    }

    // --- STAGE 6: VULNERABILITY VALIDATION ---
    if (shouldRun('nuclei-scan')) {
        await ensureNotCancelled(jobId);
        log('[STAGE 6] Vulnerability Validation (Nuclei)...', jobId);
        try {
            const nucleiOut = await runCommand(`nuclei -u ${targetUrl} -severity critical,high,medium -json -silent`);
            const nucleiFindings = parseNucleiOutput(nucleiOut);
            await saveBatchFindings(jobId, nucleiFindings, 'Nuclei');
        } catch (e) {
            log(`[WARN] Nuclei failed: ${String(e)}`, jobId);
        }
    } else {
        log('[STAGE 6] Vulnerability Validation - SKIPPED', jobId);
    }

    // --- STAGE 7: PORT SCANNING ---
    if (shouldRun('port-scan')) {
        await ensureNotCancelled(jobId);
        log('[STAGE 7] Port Scanning (Nmap)...', jobId);
        try {
            const nmapOut = await runCommand(`nmap -sV -T4 --top-ports ${aggressive ? 1000 : 100} ${primaryDomain}`);
            const nmapFindings = parseNmapOutput(nmapOut);
            await saveBatchFindings(jobId, nmapFindings, 'Ports');
        } catch (e) {
            log(`[WARN] Nmap failed: ${String(e)}`, jobId);
        }

        await ensureNotCancelled(jobId);
        log('[STAGE 10] SSRF Testing...', jobId);
        try {
            await runSSRFScanning(jobId, targetUrl, authHeader);
        } catch (e) {
            log(`[WARN] SSRF scanning failed: ${String(e)}`, jobId);
        }

        await ensureNotCancelled(jobId);
        log('[STAGE 11] Deserialization Testing...', jobId);
        try {
            await runDeserializationScanning(jobId, targetUrl, authHeader);
        } catch (e) {
            log(`[WARN] Deserialization scanning failed: ${String(e)}`, jobId);
        }

        await ensureNotCancelled(jobId);
        log('[STAGE 12] Business Logic Testing...', jobId);
        try {
            await runBusinessLogicTesting(jobId, targetUrl, authHeader);
        } catch (e) {
            log(`[WARN] Business logic testing failed: ${String(e)}`, jobId);
        }

        await ensureNotCancelled(jobId);
        log('[STAGE 13] Cloud Security Testing...', jobId);
        try {
            await runCloudSecurityScanning(jobId, primaryDomain);
        } catch (e) {
            log(`[WARN] Cloud security scanning failed: ${String(e)}`, jobId);
        }

        await ensureNotCancelled(jobId);
        log('[STAGE 14] Advanced Authentication Testing...', jobId);
        try {
            await runAuthenticationTesting(jobId, targetUrl);
        } catch (e) {
            log(`[WARN] Authentication testing failed: ${String(e)}`, jobId);
        }

        // --- FINALIZE ---
        log('[CYBER WARFARE] Assessment complete – aggregating results.', jobId);

        // Generate PDF report
        log('[REPORT] Generating comprehensive PDF report...', jobId);
        const pdfPath = await generateReport(jobId);

        if (pdfPath) {
            log('[REPORT] PDF generated successfully', jobId);

            // Get job details for email
            const job = await prisma.job.findUnique({
                where: { id: jobId },
                include: { user: true }
            });

            if (job && job.user.email) {
                try {
                    log(`[EMAIL] Sending report to ${job.user.email}...`, jobId);
                    await sendReportEmail(job.user.email, jobId, job.target, pdfPath);
                    log('[EMAIL] Report sent successfully!', jobId);
                } catch (e) {
                    log(`[ERROR] Failed to send email: ${String(e)}`, jobId);
                }
            }
        }

        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date()
            }
        });

        log(`[SUCCESS] Job ${jobId} completed successfully`, jobId);
    };
