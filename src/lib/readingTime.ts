import readingTime from 'reading-time';

export function getReadingTime(text: string): string {
	const stats = readingTime(text);
	return `${Math.ceil(stats.minutes)} min read`;
}

export function getReadingTimeMinutes(text: string): number {
	return Math.ceil(readingTime(text).minutes) || 1;
}
