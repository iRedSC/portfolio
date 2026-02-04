import { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ContactForm() {
	const [status, setStatus] = useState<Status>('idle');
	const [message, setMessage] = useState('');

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus('loading');
		setMessage('');
		const form = event.currentTarget;
		const formData = new FormData(form);
		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				body: formData,
			});
			if (!response.ok) throw new Error('Failed');
			setStatus('success');
			setMessage('Message sent! Thanks for reaching out.');
			form.reset();
		} catch (error) {
			setStatus('error');
			setMessage('Something went wrong. Please try again later.');
		}
	}

	return (
		<form className="contact-form" onSubmit={handleSubmit}>
			<div className="form-field">
				<label htmlFor="name">Name</label>
				<input id="name" name="name" type="text" required />
			</div>
			<div className="form-field">
				<label htmlFor="email">Email</label>
				<input id="email" name="email" type="email" required />
			</div>
			<div className="sr-only">
				<label htmlFor="company">Leave this empty</label>
				<input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
			</div>
			<div className="form-field">
				<label htmlFor="message">Message</label>
				<textarea id="message" name="message" rows={5} required />
			</div>
			<button type="submit" disabled={status === 'loading'}>
				{status === 'loading' ? 'Sending...' : 'Send message'}
			</button>
			{message && <p className="form-message">{message}</p>}
		</form>
	);
}