export function uniqueTags(items: { tags: string[] }[]) {
	const set = new Set<string>();
	items.forEach((item) => item.tags.forEach((tag) => set.add(tag.toLowerCase())));
	return Array.from(set).sort();
}

export function matchesQuery(text: string, query: string) {
	return text.toLowerCase().includes(query.trim().toLowerCase());
}
