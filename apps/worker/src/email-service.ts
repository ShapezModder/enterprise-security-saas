import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Email configuration
const EMAIL_USER = 'supercellatcoc@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASSWORD || ''; // You'll set this in .env

export async function sendReportEmail(
    recipientEmail: string,
    jobId: string,
    target: string,
    pdfPath: string
) {
    console.log(`[EMAIL] Sending report to ${recipientEmail}...`);

    // Create transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });

    // Email content
    const mailOptions = {
        from: `FORTRESS.ai Security <${EMAIL_USER}>`,
        to: recipientEmail,
        subject: `Security Assessment Report - ${target}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 32px;">FORTRESS.ai</h1>
                    <p style="color: #e0e0e0; margin: 10px 0 0 0;">Enterprise Security Platform</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333; margin-top: 0;">Security Assessment Complete</h2>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Your comprehensive security assessment for <strong>${target}</strong> has been completed.
                    </p>
                    
                    <div style="background: white; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #666;"><strong>Job ID:</strong> ${jobId}</p>
                        <p style="margin: 10px 0 0 0; color: #666;"><strong>Target:</strong> ${target}</p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Please find the detailed security assessment report attached to this email.
                        The report includes:
                    </p>
                    
                    <ul style="color: #666; line-height: 1.8;">
                        <li>Executive Summary</li>
                        <li>Vulnerability Findings with CVSS Scores</li>
                        <li>Compliance Mapping (OWASP, PCI-DSS)</li>
                        <li>Remediation Recommendations</li>
                    </ul>
                    
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404;">
                            <strong>⚠️ Confidential:</strong> This report contains sensitive security information. 
                            Please handle with appropriate care and do not forward without authorization.
                        </p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        If you have any questions about the findings or need clarification, 
                        please don't hesitate to reach out.
                    </p>
                </div>
                
                <div style="background: #333; padding: 20px; text-align: center;">
                    <p style="color: #999; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} FORTRESS.ai - Military-Grade Cyber Warfare Engine
                    </p>
                    <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </div>
        `,
        attachments: [
            {
                filename: `Security_Report_${jobId}.pdf`,
                path: pdfPath
            }
        ]
    };

    // Send email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Report sent successfully to ${recipientEmail}`);
        console.log(`[EMAIL] Message ID: ${info.messageId}`);

        // Delete PDF after sending to save storage
        try {
            fs.unlinkSync(pdfPath);
            console.log(`[EMAIL] Deleted PDF file to save storage: ${pdfPath}`);
        } catch (e) {
            console.warn(`[EMAIL] Could not delete PDF: ${e}`);
        }

        return true;
    } catch (error) {
        console.error(`[EMAIL] Failed to send report:`, error);
        throw error;
    }
}

export async function sendDeclineEmail(
    recipientEmail: string,
    target: string,
    reason?: string
) {
    console.log(`[EMAIL] Sending decline notification to ${recipientEmail}...`);

    // Create transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });

    // Professional decline email template
    const mailOptions = {
        from: `FORTRESS.ai Security <${EMAIL_USER}>`,
        to: recipientEmail,
        subject: `🛡️ Security Assessment Request - Status Update`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 32px;">🛡️ FORTRESS.ai</h1>
                    <p style="color: #e0e0e0; margin: 10px 0 0 0;">Enterprise Security Intelligence Platform</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333; margin-top: 0;">Assessment Request Update</h2>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Dear Valued Client,
                    </p>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Thank you for your interest in FORTRESS.ai's security assessment services. 
                        We have reviewed your request for:
                    </p>
                    
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404;">
                            <strong>Target:</strong> ${target}
                        </p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        After careful consideration, we are <strong>unable to proceed</strong> with this 
                        assessment request at this time.
                    </p>
                    
                    ${reason ? `
                    <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #721c24;">
                            <strong>Reason:</strong><br/>
                            ${reason}
                        </p>
                    </div>
                    ` : ''}
                    
                    <h3 style="color: #333; margin-top: 30px;">Next Steps</h3>
                    <ul style="color: #666; line-height: 1.8;">
                        <li>Review our engagement requirements to ensure proper documentation</li>
                        <li>Verify Rules of Engagement (RoE) documents are signed and uploaded</li>
                        <li>Ensure proper authorization for the target domain/IP range</li>
                        <li>Submit a new request with corrected information</li>
                    </ul>
                    
                    <p style="color: #666; line-height: 1.6;">
                        If you have questions or need assistance with your submission, 
                        please don't hesitate to contact our security team at 
                        <a href="mailto:${EMAIL_USER}" style="color: #22c55e; text-decoration: none;">${EMAIL_USER}</a>
                    </p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666; line-height: 1.6; margin: 0;">
                            Best regards,<br/>
                            <strong>FORTRESS.ai Security Team</strong>
                        </p>
                    </div>
                </div>
                
                <div style="background: #333; padding: 20px; text-align: center;">
                    <p style="color: #999; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} FORTRESS.ai | Advanced Security Intelligence Platform
                    </p>
                    <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
                        This is an automated message. Please do not reply directly to this email.
                    </p>
                </div>
            </div>
        `
    };

    // Send email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Decline notification sent successfully to ${recipientEmail}`);
        console.log(`[EMAIL] Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL] Failed to send decline notification:`, error);
        throw error;
    }
}
