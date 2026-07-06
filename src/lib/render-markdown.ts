import { createMarkdownProcessor } from '@astrojs/markdown-remark';

let processor: Awaited<ReturnType<typeof createMarkdownProcessor>> | null = null;

async function getProcessor() {
	if (!processor) {
		processor = await createMarkdownProcessor({
			syntaxHighlight: false,
			gfm: true,
			smartypants: true,
		});
	}
	return processor;
}

export async function renderMarkdown(source: string): Promise<string> {
	const { render } = await getProcessor();
	const { code } = await render(source.trim());
	return code;
}

/** Strip common markdown syntax for plain-text labels (e.g. aria-label). */
export function markdownToPlainText(source: string): string {
	return source
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s?/gm, '')
		.replace(/^[-*+]\s+/gm, '')
		.replace(/^\d+\.\s+/gm, '')
		.replace(/[*_~]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}
