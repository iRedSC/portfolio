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

export const GET: APIRoute = () => {
	return new Response(
		JSON.stringify({
			error: 'Method not allowed',
			message: 'This endpoint only accepts POST requests',
		}),
		{
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		}
	);
};