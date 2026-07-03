export type SyntaxTokenType =
	| 'keyword'
	| 'string'
	| 'comment'
	| 'tag'
	| 'attr'
	| 'punct'
	| 'plain';

export type SyntaxToken = {
	type: SyntaxTokenType;
	text: string;
};

export type SyntaxChar = {
	type: SyntaxTokenType;
	char: string;
};

const KEYWORDS = new Set([
	'import',
	'export',
	'from',
	'const',
	'let',
	'var',
	'function',
	'return',
	'if',
	'else',
	'async',
	'await',
	'new',
	'typeof',
	'default',
	'type',
	'interface',
	'extends',
	'null',
	'true',
	'false',
	'undefined',
	'as',
	'switch',
	'case',
	'break',
	'throw',
	'try',
	'catch',
	'finally',
	'class',
	'static',
	'public',
	'private',
	'protected',
	'readonly',
	'void',
	'never',
	'keyof',
]);

function readString(line: string, start: number): { text: string; end: number } {
	const quote = line[start];
	let i = start + 1;

	while (i < line.length) {
		if (line[i] === '\\') {
			i += 2;
			continue;
		}
		if (line[i] === quote) {
			return { text: line.slice(start, i + 1), end: i + 1 };
		}
		i += 1;
	}

	return { text: line.slice(start), end: line.length };
}

function readWord(line: string, start: number): { text: string; end: number } {
	let i = start;
	while (i < line.length && /[\w$]/.test(line[i] ?? '')) i += 1;
	return { text: line.slice(start, i), end: i };
}

function readTag(line: string, start: number): { text: string; end: number } {
	let i = start + 1;
	if (line[i] === '/') i += 1;

	while (i < line.length && /[\w.-]/.test(line[i] ?? '')) i += 1;

	return { text: line.slice(start, i), end: i };
}

export function tokenizeLine(line: string): SyntaxToken[] {
	const tokens: SyntaxToken[] = [];
	let i = 0;
	let inTag = false;

	while (i < line.length) {
		const rest = line.slice(i);

		if (rest.startsWith('//')) {
			tokens.push({ type: 'comment', text: rest });
			break;
		}

		const char = line[i] ?? '';

		if (/\s/.test(char)) {
			let j = i + 1;
			while (j < line.length && /\s/.test(line[j] ?? '')) j += 1;
			tokens.push({ type: 'plain', text: line.slice(i, j) });
			i = j;
			continue;
		}

		if (char === '"' || char === "'" || char === '`') {
			const { text, end } = readString(line, i);
			tokens.push({ type: 'string', text });
			i = end;
			continue;
		}

		if (char === '<' && /<\/?[\w]/.test(line.slice(i, i + 2))) {
			const { text, end } = readTag(line, i);
			tokens.push({ type: 'tag', text });
			i = end;
			inTag = true;
			continue;
		}

		if (char === '>') {
			tokens.push({ type: 'punct', text: char });
			i += 1;
			inTag = false;
			continue;
		}

		if (/[a-zA-Z_$]/.test(char)) {
			const { text, end } = readWord(line, i);
			const tail = line.slice(end).trimStart();
			let type: SyntaxTokenType = 'plain';

			if (KEYWORDS.has(text)) type = 'keyword';
			else if (inTag || tail.startsWith('=') || tail.startsWith('={')) type = 'attr';

			tokens.push({ type, text });
			i = end;
			continue;
		}

		if (/[{}\[\]();,.:=!?&|+\-*/%]/.test(char)) {
			tokens.push({ type: 'punct', text: char });
			i += 1;
			continue;
		}

		tokens.push({ type: 'plain', text: char });
		i += 1;
	}

	return tokens;
}

export function flattenTokens(tokens: SyntaxToken[]): SyntaxChar[] {
	return tokens.flatMap((token) =>
		[...token.text].map((char) => ({ type: token.type, char })),
	);
}
