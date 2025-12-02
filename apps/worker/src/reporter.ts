import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FindingWithCVSS {
  severity: string;
  title: string;
  description: string;
  evidence: string;
  remediation: string;
  owaspCategory?: string | null;
  cveId?: string | null;
  pciDss?: string | null;
}

export const generateReport = async (jobId: string): Promise<string | null> => {
  console.log(`[WORKER] Generating Enterprise-Grade Compliance Report for ${jobId}`);

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { findings: true, user: true } });
  if (!job) return null;

  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    info: {
      Title: `Security Assessment Report - ${jobId}`,
      Author: 'FORTRESS.ai Enterprise Security Platform',
      Subject: 'Penetration Testing & Vulnerability Assessment',
    }
  });

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const filePath = path.join(reportDir, `Enterprise_Report_${jobId}.pdf`);
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ============================================
  // COVER PAGE
  // ============================================
  doc.rect(0, 0, 612, 792).fill('#0A0A0A');

  // Logo area
  doc.fillColor('#22C55E').fontSize(40).font('Helvetica-Bold')
    .text('FORTRESS', 50, 150, { align: 'center' });
  doc.fillColor('#FFFFFF').fontSize(40)
    .text('.ai', { align: 'center', continued: false });

  doc.moveDown(2);
  doc.fillColor('#CCCCCC').fontSize(24).font('Helvetica')
    .text('ENTERPRISE SECURITY ASSESSMENT', { align: 'center' });

  doc.moveDown(1);
  doc.fillColor('#888888').fontSize(12)
    .text('Confidential & Proprietary', { align: 'center' });

  // Assessment Details Box
  doc.rect(100, 350, 412, 200).fillAndStroke('#1A1A1A', '#22C55E');

  doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold')
    .text('ASSESSMENT DETAILS', 120, 370);

  doc.fillColor('#CCCCCC').fontSize(11).font('Helvetica')
    .text(`Target: ${job.target}`, 120, 400)
    .text(`Job ID: ${job.id}`, 120, 420)
    .text(`Scan Profile: ${job.scanProfile.toUpperCase()}`, 120, 440)
    .text(`Started: ${job.startedAt?.toLocaleString() || 'N/A'}`, 120, 460)
    .text(`Completed: ${job.completedAt?.toLocaleString() || 'N/A'}`, 120, 480)
    .text(`Total Findings: ${job.findings.length}`, 120, 500);

  // Classification
  doc.fillColor('#FF0000').fontSize(10).font('Helvetica-Bold')
    .text('CONFIDENTIAL - FOR AUTHORIZED PERSONNEL ONLY', 50, 750, { align: 'center' });

  // ============================================
  // EXECUTIVE SUMMARY
  // ============================================
  doc.addPage();
  doc.fillColor('#000000').fontSize(24).font('Helvetica-Bold')
    .text('EXECUTIVE SUMMARY', 50, 50);

  doc.moveTo(50, 85).lineTo(562, 85).stroke('#22C55E');
  doc.moveDown(2);

  // Risk Score Calculation
  const criticalCount = job.findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = job.findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = job.findings.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = job.findings.filter(f => f.severity === 'LOW').length;

  const riskScore = Math.min(100, (criticalCount * 25) + (highCount * 10) + (mediumCount * 3) + (lowCount * 1));

  let riskLevel = 'LOW';
  let riskColor = '#22C55E';
  if (riskScore >= 75) { riskLevel = 'CRITICAL'; riskColor = '#DC2626'; }
  else if (riskScore >= 50) { riskLevel = 'HIGH'; riskColor = '#F59E0B'; }
  else if (riskScore >= 25) { riskLevel = 'MEDIUM'; riskColor = '#EAB308'; }

  // Risk Score Box
  doc.rect(50, 120, 200, 100).fillAndStroke('#F5F5F5', '#CCCCCC');
  doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold')
    .text('OVERALL RISK SCORE', 60, 135);
  doc.fillColor(riskColor).fontSize(48).font('Helvetica-Bold')
    .text(riskScore.toString(), 60, 155);
  doc.fillColor('#000000').fontSize(14)
    .text(`/ 100 (${riskLevel})`, 140, 175);

  // Findings Breakdown
  doc.rect(270, 120, 292, 100).fillAndStroke('#F5F5F5', '#CCCCCC');
  doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold')
    .text('FINDINGS BREAKDOWN', 280, 135);

  doc.fillColor('#DC2626').fontSize(11).font('Helvetica')
    .text(`Critical: ${criticalCount}`, 280, 160);
  doc.fillColor('#F59E0B')
    .text(`High: ${highCount}`, 280, 178);
  doc.fillColor('#EAB308')
    .text(`Medium: ${mediumCount}`, 400, 160);
  doc.fillColor('#22C55E')
    .text(`Low: ${lowCount}`, 400, 178);

  // Key Findings
  doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold')
    .text('KEY FINDINGS', 50, 250);

  doc.fontSize(11).font('Helvetica').fillColor('#333333');
  let yPos = 275;

  const topFindings = job.findings
    .filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
    .slice(0, 5);

  if (topFindings.length === 0) {
    doc.text('No critical or high severity vulnerabilities detected.', 50, yPos);
  } else {
    topFindings.forEach((finding, idx) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      const severityColor = finding.severity === 'CRITICAL' ? '#DC2626' : '#F59E0B';
      doc.fillColor(severityColor).fontSize(10).font('Helvetica-Bold')
        .text(`[${finding.severity}]`, 50, yPos);
      doc.fillColor('#000000').fontSize(11).font('Helvetica')
        .text(finding.title.substring(0, 80), 120, yPos, { width: 442 });

      yPos += 30;
    });
  }

  // Recommendations
  doc.addPage();
  doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold')
    .text('IMMEDIATE RECOMMENDATIONS', 50, 50);

  doc.moveTo(50, 75).lineTo(562, 75).stroke('#22C55E');
  doc.moveDown(2);

  doc.fontSize(11).font('Helvetica').fillColor('#333333');
  const recommendations = [
    'Address all CRITICAL severity findings within 24-48 hours',
    'Remediate HIGH severity vulnerabilities within 1 week',
    'Implement Web Application Firewall (WAF) for immediate protection',
    'Enable security headers (CSP, HSTS, X-Frame-Options)',
    'Conduct security awareness training for development team',
    'Establish regular security scanning schedule (monthly minimum)',
    'Implement secure SDLC practices and code review processes',
  ];

  yPos = 100;
  recommendations.forEach((rec, idx) => {
    doc.fillColor('#22C55E').fontSize(14).text('•', 50, yPos);
    doc.fillColor('#000000').fontSize(11).text(rec, 70, yPos, { width: 492 });
    yPos += 35;
  });

  // ============================================
  // DETAILED FINDINGS
  // ============================================
  doc.addPage();
  doc.fillColor('#000000').fontSize(24).font('Helvetica-Bold')
    .text('DETAILED VULNERABILITY MATRIX', 50, 50);

  doc.moveTo(50, 85).lineTo(562, 85).stroke('#22C55E');
  doc.moveDown(2);

  yPos = 110;

  job.findings.forEach((finding: FindingWithCVSS, index) => {
    if (yPos > 650) {
      doc.addPage();
      yPos = 50;
    }

    // Finding Header
    const severityColors: Record<string, string> = {
      CRITICAL: '#DC2626',
      HIGH: '#F59E0B',
      MEDIUM: '#EAB308',
      LOW: '#22C55E',
      INFO: '#3B82F6'
    };

    const bgColor = severityColors[finding.severity] || '#CCCCCC';

    doc.rect(50, yPos, 512, 25).fillAndStroke(bgColor, bgColor);
    doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold')
      .text(`${index + 1}. [${finding.severity}] ${finding.title}`, 60, yPos + 7, { width: 492 });

    yPos += 30;

    // Finding Details
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
      .text('Description:', 60, yPos);
    doc.font('Helvetica').fillColor('#333333')
      .text(finding.description, 60, yPos + 15, { width: 492 });

    yPos += Math.max(40, Math.ceil(finding.description.length / 80) * 12 + 20);

    // Evidence
    if (finding.evidence && yPos < 680) {
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
        .text('Evidence:', 60, yPos);
      doc.font('Courier').fontSize(9).fillColor('#555555')
        .text(finding.evidence.substring(0, 300), 60, yPos + 15, { width: 492 });

      yPos += Math.max(40, Math.ceil(finding.evidence.substring(0, 300).length / 90) * 10 + 20);
    }

    // Remediation
    if (yPos < 680) {
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
        .text('Remediation:', 60, yPos);
      doc.font('Helvetica').fillColor('#333333')
        .text(finding.remediation, 60, yPos + 15, { width: 492 });

      yPos += Math.max(40, Math.ceil(finding.remediation.length / 80) * 12 + 20);
    }

    // Compliance Mapping
    if ((finding.owaspCategory || finding.cveId || finding.pciDss) && yPos < 700) {
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold')
        .text('Compliance:', 60, yPos);

      let complianceText = '';
      if (finding.owaspCategory) complianceText += `OWASP: ${finding.owaspCategory}  `;
      if (finding.cveId) complianceText += `CVE: ${finding.cveId}  `;
      if (finding.pciDss) complianceText += `PCI-DSS: ${finding.pciDss}`;

      doc.font('Helvetica').fontSize(8).fillColor('#666666')
        .text(complianceText, 60, yPos + 12, { width: 492 });

      yPos += 30;
    }

    yPos += 15; // Spacing between findings
  });

  // ============================================
  // COMPLIANCE SUMMARY
  // ============================================
  doc.addPage();
  doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold')
    .text('COMPLIANCE & STANDARDS MAPPING', 50, 50);

  doc.moveTo(50, 80).lineTo(562, 80).stroke('#22C55E');
  doc.moveDown(2);

  const complianceStandards = [
    { name: 'OWASP Top 10 2021', status: job.findings.some(f => f.owaspCategory) ? 'TESTED' : 'N/A' },
    { name: 'PCI-DSS v4.0', status: 'APPLICABLE' },
    { name: 'ISO 27001:2022', status: 'APPLICABLE' },
    { name: 'HIPAA Security Rule', status: 'APPLICABLE' },
    { name: 'GDPR Article 32', status: 'APPLICABLE' },
    { name: 'SOC 2 Type II', status: 'APPLICABLE' },
  ];

  yPos = 110;
  complianceStandards.forEach(standard => {
    doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold')
      .text(standard.name, 60, yPos);
    doc.fillColor('#22C55E').fontSize(10).font('Helvetica')
      .text(standard.status, 400, yPos);
    yPos += 25;
  });

  // ============================================
  // FOOTER
  // ============================================
  doc.addPage();
  doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold')
    .text('ABOUT FORTRESS.AI', 50, 50);

  doc.fontSize(11).font('Helvetica').fillColor('#333333')
    .text('FORTRESS.ai is an enterprise-grade autonomous security assessment platform that combines 16+ offensive security engines with AI-driven heuristics. Our platform delivers military-grade vulnerability scanning, compliance automation, and real-time threat detection for modern infrastructure.', 50, 90, { width: 512, align: 'justify' });

  doc.moveDown(2);
  doc.fontSize(10).fillColor('#666666')
    .text('This report is confidential and intended solely for the use of the organization named herein. Unauthorized distribution or disclosure is strictly prohibited.', 50, 200, { width: 512, align: 'center' });

  doc.moveDown(2);
  doc.fillColor('#22C55E').fontSize(12).font('Helvetica-Bold')
    .text('FORTRESS.ai Enterprise Security Platform', { align: 'center' })
    .fillColor('#888888').fontSize(10).font('Helvetica')
    .text('Powered by Advanced AI & 16-Stage Penetration Testing', { align: 'center' });

  doc.end();

  return new Promise((resolve) => stream.on('finish', () => resolve(filePath)));
};