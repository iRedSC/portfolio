export class CommandAlreadyExists extends Error {
	constructor(name: string) {
		super(`Command or alias already exists: ${name}`);
		this.name = 'CommandAlreadyExists';
	}
}

export class EngineRequired extends Error {
	constructor() {
		super('This command requires an InvokeEngine.');
		this.name = 'EngineRequired';
	}
}

export type CommandFunction = (...args: unknown[]) => unknown;

type CommandRequirements = Record<string, boolean>;
type CommandInjections = Record<string, unknown>;

type CommandMetadata = {
	requires: CommandRequirements;
	injections: CommandInjections;
	func?: CommandFunction;
	helptext?: string;
};

type CommandInput = CommandFunction | Command | CommandMetadata;

type CommandOptions = {
	name?: string;
	aliases?: string[];
};

type InvokeOptions = {
	engine?: InvokeEngine;
	injections?: CommandInjections;
};

function isCommandMetadata(value: CommandInput): value is CommandMetadata {
	return 'requires' in value && 'injections' in value && !('children' in value);
}

function getFunctionName(func: CommandFunction): string {
	return func.name || 'anonymous';
}

export const meta = {
	require(requirements: CommandRequirements): (func: CommandFunction | CommandMetadata) => CommandMetadata {
		return (func) => {
			if (isCommandMetadata(func)) {
				return { ...func, requires: { ...func.requires, ...requirements } };
			}
			return { requires: requirements, injections: {}, func, helptext: '' };
		};
	},

	inject(injections: CommandInjections): (func: CommandFunction | CommandMetadata) => CommandMetadata {
		return (func) => {
			if (isCommandMetadata(func)) {
				return { ...func, injections: { ...func.injections, ...injections } };
			}
			return { requires: {}, injections, func, helptext: '' };
		};
	},

	help(text: string): (func: CommandFunction | CommandMetadata) => CommandMetadata {
		return (func) => {
			if (isCommandMetadata(func)) {
				return { ...func, helptext: text };
			}
			return { requires: {}, injections: {}, func, helptext: text };
		};
	},
};

export class Command {
	func: CommandFunction;
	name: string;
	aliases: string[];
	requires: CommandRequirements;
	injections: CommandInjections;
	children: Map<string, Command>;
	helptext?: string;

	constructor(
		func: CommandFunction,
		name: string,
		aliases: string[] = [],
		requires: CommandRequirements = {},
		injections: CommandInjections = {},
		helptext?: string,
	) {
		this.func = func;
		this.name = name;
		this.aliases = aliases;
		this.requires = requires;
		this.injections = injections;
		this.children = new Map();
		this.helptext = helptext;
	}

	invoke(args: unknown[] = [], options: InvokeOptions = {}): unknown {
		const resolvedInjections = { ...this.injections, ...options.injections };

		if (this.requires.engine) {
			if (!options.engine) throw new EngineRequired();
			resolvedInjections.engine = options.engine;
		}

		if (this.requires.command) {
			resolvedInjections.command = this;
		}

		return this.func(...args, resolvedInjections);
	}

	subcommand(func: CommandInput, options: CommandOptions = {}): Command {
		return createCommand(func, this.children, options);
	}

	toString(): string {
		return `Command(func=${getFunctionName(this.func)}, aliases=${this.aliases.join(',')})`;
	}
}

function createCommand(
	input: CommandInput,
	commandMap: Map<string, Command>,
	options: CommandOptions = {},
): Command {
	const aliases = [...(options.aliases ?? [])];

	let command: Command;
	if (input instanceof Command) {
		command = input;
	} else {
		const metadata = isCommandMetadata(input)
			? input
			: { requires: {}, injections: {}, func: input, helptext: '' };

		if (!metadata.func) {
			throw new TypeError('Command metadata must include a function.');
		}

		command = new Command(
			metadata.func,
			options.name ?? getFunctionName(metadata.func),
			aliases,
			metadata.requires,
			metadata.injections,
			metadata.helptext,
		);
	}

	const commandNames = [...aliases, command.name];
	for (const commandName of commandNames) {
		if (commandMap.has(commandName)) {
			throw new CommandAlreadyExists(commandName);
		}
		commandMap.set(commandName, command);
	}

	return command;
}

export class InvokeEngine {
	commands: Map<string, Command>;

	constructor() {
		this.commands = new Map();
	}

	parse(
		commandList: unknown[],
		command?: Command,
		callstack: Command[] = [],
	): [Command | undefined, unknown[], Command[]] {
		if (command) {
			callstack.push(command);
		}

		if (commandList.length === 0) {
			return [command, commandList, callstack];
		}

		const [head, ...rest] = commandList;
		if (typeof head !== 'string') {
			return [command, commandList, callstack];
		}

		const nextCommand = command ? command.children.get(head) : this.commands.get(head);
		if (!nextCommand) {
			return [command, commandList, callstack];
		}

		return this.parse(rest, nextCommand, callstack);
	}

	command(func: CommandInput, options: CommandOptions = {}): Command {
		return createCommand(func, this.commands, options);
	}
}

function readQuotedString(input: string, start: number): [string, number] {
	let value = '';
	let index = start + 1;

	while (index < input.length) {
		const char = input[index];
		if (char === '"') {
			return [value, index + 1];
		}
		if (char === '\\') {
			const next = input[index + 1];
			if (next === 'n') value += '\n';
			else if (next === '"' || next === '\\') value += next;
			else value += next ?? '';
			index += 2;
			continue;
		}
		value += char;
		index += 1;
	}

	return [value, index];
}

function coerceToken(token: string): string | number {
	if (/^-?\d+$/.test(token)) return Number.parseInt(token, 10);
	if (/^-?(?:\d*\.\d+|\d+\.\d*)$/.test(token)) return Number.parseFloat(token);
	return token;
}

function parseList(input: string, start: number): [unknown[], number] {
	const values: unknown[] = [];
	let index = start + 1;

	while (index < input.length) {
		const char = input[index];
		if (/\s|,/.test(char)) {
			index += 1;
			continue;
		}
		if (char === ']') {
			return [values, index + 1];
		}
		if (char === '[') {
			const [list, nextIndex] = parseList(input, index);
			values.push(list);
			index = nextIndex;
			continue;
		}
		if (char === '"') {
			const [string, nextIndex] = readQuotedString(input, index);
			values.push(string);
			index = nextIndex;
			continue;
		}

		let token = '';
		while (index < input.length && !/[\s,\[\]]/.test(input[index])) {
			token += input[index];
			index += 1;
		}
		values.push(coerceToken(token));
	}

	return [values, index];
}

export function stringToArgs(input: string): unknown[] {
	const args: unknown[] = [];
	let index = 0;

	while (index < input.length) {
		const char = input[index];
		if (/\s/.test(char)) {
			index += 1;
			continue;
		}
		if (char === '[') {
			const [list, nextIndex] = parseList(input, index);
			args.push(list);
			index = nextIndex;
			continue;
		}
		if (char === '"') {
			const [string, nextIndex] = readQuotedString(input, index);
			args.push(string);
			index = nextIndex;
			continue;
		}

		let token = '';
		while (index < input.length && !/[\s\[\]]/.test(input[index])) {
			token += input[index];
			index += 1;
		}
		args.push(coerceToken(token));
	}

	return args;
}

export const string_to_args = stringToArgs;
