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

const socket = ioClient(apiUrl);

socket.on('connect_error', (err) => {
    console.error(`[SCANNER] Socket.IO Connection Error (URL: ${apiUrl}):`, err);
});

socket.on('connect', () => {
    console.log('[SCANNER] Connected to API for log streaming');
});

socket.on('disconnect', () => {
    console.log('[SCANNER] Disconnected from API');
});

export interface ScanOptions {
    aggressive?: boolean;          // turn up depth/threads/templates
    destructive?: boolean;         // allow SQLMap/Commix style intrusive tests
    maxBulkTargets?: number;       // how many subdomains to hit with heavy scanners
}

// --- HELPER: LOGGING with Socket.IO ---
const log = (msg: string, jobId?: string) => {
    console.log(msg);
    // Stream to admin dashboard via Socket.IO
    if (jobId && socket.connected) {
        socket.emit('scan_log', { jobId, log: msg });
    }
};

// --- UTILITIES ---

function runCommand(cmd: string): Promise<string> {
    return new Promise((resolve) => {
        exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
            // Many security tools use non-zero exit codes for \"findings\" – don't treat as fatal.
            resolve(stdout || stderr);
        });
    });
}

function safeReadFile(filePath: string): string {
    try { return fs.readFileSync(filePath, 'utf-8'); }
    catch { return ''; }
}

// Prefer images that actually exist locally; fall back to original names
async function chooseImage(candidates: string[], fallback: string, jobId?: string): Promise<string> {
    for (const img of candidates) {
        try {
            const out = await runCommand(`docker images -q ${img}`);
            if (out && out.trim().length > 0) {
                log(`[DOCKER] Using local image: ${img}`, jobId);
                return img;
            }
            const out2 = await runCommand(`docker images -q docker.io/${img}`);
            if (out2 && out2.trim().length > 0) {
                const full = `docker.io/${img}`;
                log(`[DOCKER] Using local image: ${full}`, jobId);
                return full;
            }
        } catch {
            // ignore and try next
        }
    }
    log(`[DOCKER] No preferred local image found. Falling back to: ${fallback}`, jobId);
    return fallback;
}

// Optional: allow cancelling a running job by changing DB status to \"CANCELLED\"
async function ensureNotCancelled(jobId: string) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (job && (job as any).status === 'CANCELLED') {
        throw new Error('Scan cancelled by user');
    }
}

// Save a single finding (dedup on jobId+title)
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

function parseHogOutput(output: string) {
    const findings: any[] = [];
    if (!output.trim()) return findings;
    const lines = output.split('\\n');
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            if (data.SourceMetadata) {
                findings.push({
                    title: `Leaked Secret: ${data.DetectorName}`,
                    severity: 'critical',
                    description: `Active credential detected in production assets.`,
                    evidence: `Raw Secret: ${String(data.RawEnvelope || '').substring(0, 10)}...`,
                    remediation: 'Immediate rotation and key revocation required.'
                });
            }
        } catch { /* ignore */ }
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

// --- MAIN SCAN PIPELINE ---

export const runEnterpriseScan = async (
    jobId: string,
    primaryDomain: string,
    authHeader: string | null,
    options: ScanOptions = {}
) => {
    const aggressive = options.aggressive ?? true;
    const destructive = options.destructive ?? true;
    const maxBulkTargets = options.maxBulkTargets ?? (aggressive ? 25 : 10);

    log(`[CYBER WARFARE] Initiating Total Infrastructure Assessment for ${primaryDomain}...`, jobId);
    log(`[CONFIG] Aggressive: ${aggressive}, Destructive: ${destructive}, MaxTargets: ${maxBulkTargets}`, jobId);

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const targetUrl = primaryDomain.startsWith('http') ? primaryDomain : `https://${primaryDomain}`;

    // --- STAGE 0: WAF FINGERPRINTING ---
    await ensureNotCancelled(jobId);
    log('[STAGE 0] WAF Fingerprinting (wafw00f)...', jobId);
    const wafImage = await chooseImage(['secsi/wafw00f:latest'], 'secsi/wafw00f:latest', jobId);
    const wafOut = await runCommand(`docker run --rm ${wafImage} ${targetUrl}`);
    if (wafOut.toLowerCase().includes('cloudflare') || wafOut.toLowerCase().includes('akamai')) {
        await saveFinding(jobId, 'WAF', 'WAF Detected', 'info', `WAF detected: ${wafOut.substring(0, 200)}`, wafOut.substring(0, 500), 'WAF is active. Adjust scan intensity accordingly.');
    }

    // --- STAGE 1: TECH STACK DETECTION ---
    await ensureNotCancelled(jobId);
    log('[STAGE 1] Tech Stack Detection (WhatWeb)...', jobId);
    const wwImage = await chooseImage(['urbanadventurer/whatweb:latest'], 'urbanadventurer/whatweb:latest', jobId);
    const wwOut = await runCommand(`docker run --rm ${wwImage} ${targetUrl}`);
    if (wwOut) {
        await saveFinding(jobId, 'Recon', 'Technology Stack', 'info', `Detected technologies: ${wwOut.substring(0, 300)}`, wwOut.substring(0, 1000), 'Review exposed technology versions for known vulnerabilities.');
    }

    // --- STAGE 2: SUBDOMAIN ENUMERATION ---
    await ensureNotCancelled(jobId);
    log('[STAGE 2] Subdomain Enumeration (subfinder)...', jobId);
    const subImage = await chooseImage(['projectdiscovery/subfinder:latest'], 'projectdiscovery/subfinder:latest', jobId);
    const subFile = `subdomains-${jobId}.txt`;
    await runCommand(`docker run --rm -v "${OUTPUT_DIR}:/data" ${subImage} -d ${primaryDomain} -o /data/${subFile} -silent`);
    const subData = safeReadFile(path.join(OUTPUT_DIR, subFile));
    const subdomains = subData.split('\\n').filter(s => s.trim());
    log(`[RECON] Found ${subdomains.length} subdomains`, jobId);

    // --- STAGE 3: WORDPRESS DETECTION ---
    await ensureNotCancelled(jobId);
    const isWordPress = WP_DETECTION_KEYWORDS.some(kw => wwOut.toLowerCase().includes(kw));
    if (isWordPress) {
        log('[STAGE 3] WordPress Detected - Running WPScan...', jobId);
        const wpImage = await chooseImage(['wpscanteam/wpscan:latest'], 'wpscanteam/wpscan:latest', jobId);
        const wpOut = await runCommand(`docker run --rm ${wpImage} --url ${targetUrl} --enumerate vp,vt --format json --no-banner`);
        if (wpOut.includes('vulnerabilities')) {
            await saveFinding(jobId, 'WordPress', 'WordPress Vulnerabilities Found', 'high', 'WPScan detected vulnerable plugins or themes.', wpOut.substring(0, 2000), 'Update WordPress core, plugins, and themes to latest versions.');
        }
    } else {
        log('[STAGE 3] WordPress not detected, skipping WPScan', jobId);
    }

    // --- STAGE 4: DEEP WEB CRAWLING ---
    await ensureNotCancelled(jobId);
    log('[STAGE 4] Deep Web Crawling (Katana)...', jobId);
    const katanaImage = await chooseImage(['projectdiscovery/katana:latest'], 'projectdiscovery/katana:latest', jobId);
    const crawlFile = `crawl-${jobId}.txt`;
    await runCommand(`docker run --rm -v "${OUTPUT_DIR}:/data" ${katanaImage} -u ${targetUrl} -d ${aggressive ? 5 : 3} -o /data/${crawlFile} -silent`);
    const crawlData = safeReadFile(path.join(OUTPUT_DIR, crawlFile));
    log(`[CRAWL] Discovered ${crawlData.split('\\n').length} URLs`, jobId);

    // --- STAGE 5: DIRECTORY FUZZING ---
    await ensureNotCancelled(jobId);
    log('[STAGE 5] Directory Fuzzing (FFUF)...', jobId);
    const ffufImage = await chooseImage(['secsi/ffuf:latest'], 'secsi/ffuf:latest', jobId);
    const ffufFile = `ffuf-${jobId}.json`;
    await runCommand(`docker run --rm -v "${OUTPUT_DIR}:/data" ${ffufImage} -u ${targetUrl}/FUZZ -w /data/common.txt -o /data/${ffufFile} -of json -mc 200,301,302,403 -fc 404 -t ${aggressive ? 50 : 20}`);
    const ffufData = safeReadFile(path.join(OUTPUT_DIR, ffufFile));
    const ffufFindings = parseFfufOutput(ffufData);
    await saveBatchFindings(jobId, ffufFindings, 'Fuzzing');

    // --- STAGE 6: WEB SERVER CHECKS ---
    await ensureNotCancelled(jobId);
    log('[STAGE 6] Web Server Checks (Nikto)...', jobId);
    const niktoImage = await chooseImage(['frapsoft/nikto:latest'], 'frapsoft/nikto:latest', jobId);
    const niktoOut = await runCommand(`docker run --rm ${niktoImage} -h ${targetUrl} -Tuning 123bde`);
    if (niktoOut.includes('OSVDB') || niktoOut.includes('CVE')) {
        await saveFinding(jobId, 'WebServer', 'Nikto Findings', 'medium', 'Nikto detected potential web server vulnerabilities.', niktoOut.substring(0, 2000), 'Review Nikto output and apply recommended patches.');
    }

    // --- STAGE 7: SECRET HUNTING ---
    await ensureNotCancelled(jobId);
    log('[STAGE 7] Secret Hunting (TruffleHog)...', jobId);
    const hogImage = await chooseImage(['trufflesecurity/trufflehog:latest'], 'trufflesecurity/trufflehog:latest', jobId);
    const hogOut = await runCommand(`docker run --rm ${hogImage} http ${targetUrl} --json`);
    const hogFindings = parseHogOutput(hogOut);
    await saveBatchFindings(jobId, hogFindings, 'Secrets');

    // --- STAGE 8: SSL/TLS ASSESSMENT ---
    await ensureNotCancelled(jobId);
    log('[STAGE 8] SSL/TLS Assessment (testssl.sh)...', jobId);
    const sslImage = await chooseImage(['drwetter/testssl.sh:latest'], 'drwetter/testssl.sh:latest', jobId);
    const sslOut = await runCommand(`docker run --rm ${sslImage} --jsonfile-pretty /dev/stdout ${targetUrl}`);
    const sslFindings = parseSslOutput(sslOut);
    await saveBatchFindings(jobId, sslFindings, 'SSL/TLS');

    // --- STAGE 9: VULNERABILITY VALIDATION ---
    await ensureNotCancelled(jobId);
    log('[STAGE 9] Vulnerability Validation (Nuclei)...', jobId);
    const nucleiImage = await chooseImage(['projectdiscovery/nuclei:latest'], 'projectdiscovery/nuclei:latest', jobId);
    const nucleiOut = await runCommand(`docker run --rm ${nucleiImage} -u ${targetUrl} -severity critical,high,medium -json -silent`);
    const nucleiFindings = parseNucleiOutput(nucleiOut);
    await saveBatchFindings(jobId, nucleiFindings, 'Nuclei');

    // --- STAGE 10: PORT SCANNING ---
    await ensureNotCancelled(jobId);
    log('[STAGE 10] Port Scanning (Nmap)...', jobId);
    const nmapImage = await chooseImage(['instrumentisto/nmap:latest'], 'instrumentisto/nmap:latest', jobId);
    const nmapOut = await runCommand(`docker run --rm ${nmapImage} -sV -T4 --top-ports ${aggressive ? 1000 : 100} ${primaryDomain}`);
    const nmapFindings = parseNmapOutput(nmapOut);
    await saveBatchFindings(jobId, nmapFindings, 'Ports');

    // --- STAGE 11-17: ADVANCED ATTACK VECTORS ---
    if (destructive) {
        log('[STAGE 11] SQL Injection Testing (SQLMap)...', jobId);
        const sqlmapImage = await chooseImage(['sagikazarmark/sqlmap:latest'], 'sagikazarmark/sqlmap:latest', jobId);
        for (const url of crawlData.split('\\n').slice(0, 5)) {
            if (url.includes('?')) {
                const sqlOut = await runCommand(`docker run --rm ${sqlmapImage} -u "${url}" --batch --risk 2 --level 2`);
                if (sqlOut.includes('vulnerable')) {
                    await saveFinding(jobId, 'SQLi', `SQL Injection in ${url}`, 'critical', 'SQLMap detected SQL injection vulnerability.', sqlOut.substring(0, 2000), 'Use parameterized queries and input validation.');
                }
            }
        }

        log('[STAGE 12] Command Injection Testing (Commix)...', jobId);
        const commixImage = await chooseImage(['commixproject/commix-testbed:latest'], 'commixproject/commix-testbed:latest', jobId);
        for (const url of crawlData.split('\\n').slice(0, 5)) {
            if (url.includes('?')) {
                const commixOut = await runCommand(`docker run --rm ${commixImage} --url="${url}" --batch`);
                if (commixOut.includes('vulnerable')) {
                    await saveFinding(jobId, 'CMDi', `Command Injection in ${url}`, 'critical', 'Commix detected command injection vulnerability.', commixOut.substring(0, 2000), 'Sanitize all user input and avoid shell execution.');
                }
            }
        }
    } else {
        log('[STAGE 11-12] Destructive tests skipped (destructive=false)', jobId);
    }

    // Advanced attack stages
    const crawledUrls = crawlData.split('\\n').filter(u => u.trim().startsWith('http'));

    await ensureNotCancelled(jobId);
    log('[STAGE 13] XSS Testing...', jobId);
    try {
        await runXSSScanning(jobId, targetUrl, crawledUrls, authHeader);
    } catch (e) {
        log(`[WARN] XSS scanning failed: ${String(e)}`, jobId);
    }

    await ensureNotCancelled(jobId);
    log('[STAGE 14] XXE Testing...', jobId);
    try {
        await runXXEScanning(jobId, targetUrl, authHeader);
    } catch (e) {
        log(`[WARN] XXE scanning failed: ${String(e)}`, jobId);
    }

    await ensureNotCancelled(jobId);
    log('[STAGE 15] SSRF Testing...', jobId);
    try {
        await runSSRFScanning(jobId, targetUrl, authHeader);
    } catch (e) {
        log(`[WARN] SSRF scanning failed: ${String(e)}`, jobId);
    }

    await ensureNotCancelled(jobId);
    log('[STAGE 16] Deserialization Testing...', jobId);
    try {
        await runDeserializationScanning(jobId, targetUrl, authHeader);
    } catch (e) {
        log(`[WARN] Deserialization scanning failed: ${String(e)}`, jobId);
    }

    await ensureNotCancelled(jobId);
    log('[STAGE 17] Business Logic Testing...', jobId);
    try {
        await runBusinessLogicTesting(jobId, targetUrl, authHeader);
    } catch (e) {
        log(`[WARN] Business logic testing failed: ${String(e)}`, jobId);
    }

    await ensureNotCancelled(jobId);
    log('[STAGE 18] Cloud Security Testing...', jobId);
    try {
        await runCloudSecurityScanning(jobId, primaryDomain);
    } catch (e) {
        log(`[WARN] Cloud security scanning failed: ${String(e)}`, jobId);
    }

    await ensureNotCancelled(jobId);
    log('[STAGE 19] Advanced Authentication Testing...', jobId);
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
