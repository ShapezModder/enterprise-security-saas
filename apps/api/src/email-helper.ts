import { Resend } from 'resend';

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'onboarding@resend.dev'; // Default Resend testing domain
// For production: const FROM_EMAIL = 'security@yourdomain.com';

const resend = new Resend(RESEND_API_KEY);

export async function sendDeclineEmail(
    recipientEmail: string,
    target: string,
    reason?: string
) {
    console.log(`[EMAIL] Sending decline notification to ${recipientEmail}...`);

    if (!RESEND_API_KEY) {
        console.error('[EMAIL] RESEND_API_KEY is missing');
        // Don't throw - we don't want email failures to break API responses
        return false;
    }

    // Professional decline email template
    const htmlContent = `
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
                        <a href="mailto:security@fortress.ai" style="color: #22c55e; text-decoration: none;">security@fortress.ai</a>
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
        `;

    // Send email
    try {
        const { data, error } = await resend.emails.send({
            from: `FORTRESS.ai Security <${FROM_EMAIL}>`,
            to: recipientEmail,
            subject: `🛡️ Security Assessment Request - Status Update`,
            html: htmlContent
        });

        if (error) {
            console.error('[EMAIL] Resend API Error:', error);
            // Don't throw - we don't want email failures to break API responses
            return false;
        }

        console.log(`[EMAIL] Decline notification sent successfully to ${recipientEmail}`);
        console.log(`[EMAIL] Message ID: ${data?.id}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL] Failed to send decline notification:`, error);
        return false;
    }
}

