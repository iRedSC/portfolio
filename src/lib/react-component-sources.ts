const modules = import.meta.glob<string>('../components/**/*.tsx', {
	query: '?raw',
	import: 'default',
	eager: true,
});

export const reactComponentSources: string[] = Object.values(modules);
