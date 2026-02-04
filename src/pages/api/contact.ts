import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(request: Request) {
	return (
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip') ||
		'unknown'
	);
}

function checkRateLimit(ip: string) {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);
	if (!entry || entry.resetAt < now) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return true;
	}
	if (entry.count >= RATE_LIMIT) return false;
	entry.count += 1;
	return true;
}

export const POST: APIRoute = async ({ request }) => {
	const formData = await request.formData();
	const name = String(formData.get('name') ?? '').trim();
	const email = String(formData.get('email') ?? '').trim();
	const message = String(formData.get('message') ?? '').trim();
	const company = String(formData.get('company') ?? '').trim();

	if (company) {
		return new Response('Bot detected', { status: 400 });
	}

	if (!name || !email || !message) {
		return new Response('Missing required fields', { status: 400 });
	}

	const ip = getClientIp(request);
	if (!checkRateLimit(ip)) {
		return new Response('Too many requests', { status: 429 });
	}

	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		return new Response('Email service not configured', { status: 500 });
	}

	const resend = new Resend(apiKey);
	try {
		await resend.emails.send({
			from: 'Portfolio <onboarding@resend.dev>',
			to: ['you@example.com'],
			subject: `New message from ${name}`,
			replyTo: email,
			text: message,
		});
		return new Response('OK');
	} catch (error) {
		console.error('Email send failed', error);
		return new Response('Failed to send', { status: 500 });
	}
};
import type { APIRoute } from 'astro';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the request body
    const body: ContactFormData = await request.json();

    // Validate required fields
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'name, email, subject, and message are all required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email format'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Here you would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll just log the contact attempt
    console.log('Contact form submission:', {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
    });

    // Example integration with Resend (uncomment and configure when ready):
    /*
    const resendApiKey = import.meta.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: 'Portfolio Contact <contact@yourdomain.com>',
      to: 'your-email@yourdomain.com',
      subject: `Portfolio Contact: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    if (error) {
      throw error;
    }
    */

    // Example integration with SendGrid (uncomment and configure when ready):
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(import.meta.env.SENDGRID_API_KEY);

    const msg = {
      to: 'your-email@yourdomain.com',
      from: 'contact@yourdomain.com',
      subject: `Portfolio Contact: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    };

    await sgMail.send(msg);
    */

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for your message! I\'ll get back to you soon.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing contact form:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Sorry, there was an error sending your message. Please try again later.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Handle other HTTP methods
export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    }),
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};