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
    console.log(`[EMAIL] Decline email disabled - manual distribution workflow`);
    console.log(`[EMAIL] Customer: ${recipientEmail}, Target: ${target}, Reason: ${reason || 'N/A'}`);

    // Don't send automatic decline emails
    // Operator will handle customer communication manually
    return true;
}

