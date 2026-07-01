import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

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
		return json({ error: 'Invalid submission.' }, 400);
	}

	if (!name || !email || !message) {
		return json({ error: 'Please fill in all required fields.' }, 400);
	}

	if (!EMAIL_RE.test(email)) {
		return json({ error: 'Please enter a valid email address.' }, 400);
	}

	const ip = getClientIp(request);
	if (!checkRateLimit(ip)) {
		return json({ error: 'Too many messages. Please try again later.' }, 429);
	}

	const apiKey = process.env.RESEND_API_KEY;
	const to = process.env.CONTACT_EMAIL;
	if (!apiKey || !to) {
		console.error('Contact form missing RESEND_API_KEY or CONTACT_EMAIL');
		return json({ error: 'Email service is not configured.' }, 500);
	}

	const from = process.env.RESEND_FROM ?? 'Portfolio Contact <onboarding@resend.dev>';
	const resend = new Resend(apiKey);

	try {
		await resend.emails.send({
			from,
			to: [to],
			replyTo: email,
			subject: `Portfolio contact from ${name}`,
			text: [`Name: ${name}`, `Email: ${email}`, '', message].join('\n'),
			html: [
				`<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
				`<p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`,
				'<p><strong>Message:</strong></p>',
				`<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
			].join('\n'),
		});
		return json({ ok: true });
	} catch (error) {
		console.error('Email send failed', error);
		return json({ error: 'Failed to send message. Please try again later.' }, 500);
	}
};

export const GET: APIRoute = () => json({ error: 'Method not allowed.' }, 405);
