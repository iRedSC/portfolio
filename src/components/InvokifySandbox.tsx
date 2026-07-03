import { useEffect, useMemo, useRef, useState } from 'react';

type TranscriptLine = {
	type: 'input' | 'output' | 'error' | 'note';
	text: string;
};

type Demo = {
	id: string;
	title: string;
	description: string;
	defaultInput: string;
	exampleInputs: string[];
	code: string;
};

type SandboxResult = {
	source: 'invokify-demo-frame';
	id: number;
	input: string;
	result?: unknown;
	prints?: string[];
	parsed?: unknown[];
	args?: unknown[];
	callstack?: string[];
	command?: string;
	error?: string;
};

const demos: Demo[] = [
	{
		id: 'basic',
		title: 'Decorator-style commands',
		description: 'The tiny version: register functions, parse a string, call the matching command.',
		defaultInput: 'greet "Jeff Bridges"',
		exampleInputs: ['greet Mason', 'add 2 3', 'greet "Jeff Bridges"'],
		code: String.raw`const engine = new InvokeEngine();

engine.command(function greet(user = "friend") {
  print(` + '`Hello ${user}!`' + `);
});

engine.command(function add(a = 0, b = 0) {
  return Number(a) + Number(b);
});`,
	},
	{
		id: 'player',
		title: 'Player commands',
		description: 'Adapted from the repo examples: commands operate on shared player state.',
		defaultInput: 'buy 25',
		exampleInputs: ['buy 25', 'sell 10', 'sell alot'],
		code: String.raw`class Player {
  constructor() {
    this.money = 0;
  }

  buy(amount) {
    this.money -= Number(amount);
    return ` + '`You spent ${amount}. Balance: ${this.money}`' + `;
  }

  sell(amount) {
    this.money += Number(amount);
    return ` + '`You made ${amount}. Balance: ${this.money}`' + `;
  }
}

const engine = new InvokeEngine();
const player = new Player();

engine.command(meta.inject({ player })(function buy(amount = 0, { player }) {
  return player.buy(amount);
}));

const sell = engine.command(meta.inject({ player })(function sell(amount = 0, { player }) {
  return player.sell(amount);
}));

sell.subcommand(meta.inject({ player })(function all({ player }) {
  return player.sell(10000000);
}), { aliases: ["alot"] });`,
	},
	{
		id: 'chain',
		title: 'Passthrough chain',
		description: 'Adapted from the passthrough example: one command consumes its args, then forwards the rest.',
		defaultInput: 'buy 25 sell 10 buy 5',
		exampleInputs: ['buy 25 sell 10', 'sell 8 buy 3 sell 2', 'buy 100 sell 40 buy 10'],
		code: String.raw`class Player {
  constructor() {
    this.money = 0;
  }

  buy(amount) {
    this.money -= Number(amount);
    return ` + '`Bought for ${amount}. Balance: ${this.money}`' + `;
  }

  sell(amount) {
    this.money += Number(amount);
    return ` + '`Sold for ${amount}. Balance: ${this.money}`' + `;
  }
}

const engine = new InvokeEngine();
const player = new Player();

function chain(action) {
  return function passthrough(amount = 0, ...rest) {
    const context = rest.pop();
    const output = [player[action](amount)];
    const [nextCommand, nextArgs] = context.engine.parse(rest);

    if (nextCommand) {
      output.push(nextCommand.invoke(nextArgs, { engine: context.engine }));
    }

    return output.filter(Boolean).join("\\n");
  };
}

engine.command(meta.require({ engine: true })(chain("buy")), { name: "buy" });
engine.command(meta.require({ engine: true })(chain("sell")), { name: "sell" });`,
	},
];

const sandboxHtml = String.raw`<!doctype html>
<html>
<body>
<script>
class CommandAlreadyExists extends Error {}
class EngineRequired extends Error {}

function isMetadata(value) {
  return value && typeof value === "object" && "requires" in value && "injections" in value && !("children" in value);
}

const meta = {
  require(requirements) {
    return (func) => isMetadata(func)
      ? { ...func, requires: { ...func.requires, ...requirements } }
      : { requires: requirements, injections: {}, func, helptext: "" };
  },
  inject(injections) {
    return (func) => isMetadata(func)
      ? { ...func, injections: { ...func.injections, ...injections } }
      : { requires: {}, injections, func, helptext: "" };
  },
  help(text) {
    return (func) => isMetadata(func)
      ? { ...func, helptext: text }
      : { requires: {}, injections: {}, func, helptext: text };
  },
};

class Command {
  constructor(func, name, aliases = [], requires = {}, injections = {}, helptext = "") {
    this.func = func;
    this.name = name || func.name || "anonymous";
    this.aliases = aliases;
    this.requires = requires;
    this.injections = injections;
    this.helptext = helptext;
    this.children = new Map();
  }

  invoke(args = [], options = {}) {
    const injections = { ...this.injections, ...(options.injections || {}) };
    if (this.requires.engine) {
      if (!options.engine) throw new EngineRequired("This command requires an engine.");
      injections.engine = options.engine;
    }
    if (this.requires.command) injections.command = this;
    return this.func(...args, injections);
  }

  subcommand(input, options = {}) {
    return createCommand(input, this.children, options);
  }
}

function createCommand(input, commandMap, options = {}) {
  const aliases = [...(options.aliases || [])];
  let command;

  if (input instanceof Command) {
    command = input;
  } else {
    const metadata = isMetadata(input)
      ? input
      : { requires: {}, injections: {}, func: input, helptext: "" };
    command = new Command(
      metadata.func,
      options.name || metadata.func.name,
      aliases,
      metadata.requires,
      metadata.injections,
      metadata.helptext
    );
  }

  for (const commandName of [...aliases, command.name]) {
    if (commandMap.has(commandName)) throw new CommandAlreadyExists(commandName);
    commandMap.set(commandName, command);
  }

  return command;
}

class InvokeEngine {
  constructor() {
    this.commands = new Map();
  }

  command(input, options = {}) {
    return createCommand(input, this.commands, options);
  }

  parse(commandList, command = undefined, callstack = []) {
    if (command) callstack.push(command);
    if (commandList.length === 0) return [command, commandList, callstack];

    const [head, ...rest] = commandList;
    if (typeof head !== "string") return [command, commandList, callstack];

    const next = command ? command.children.get(head) : this.commands.get(head);
    if (!next) return [command, commandList, callstack];

    return this.parse(rest, next, callstack);
  }
}

function readQuotedString(input, start) {
  let value = "";
  let index = start + 1;
  while (index < input.length) {
    const char = input[index];
    if (char === '"') return [value, index + 1];
    if (char === "\\") {
      const next = input[index + 1];
      value += next === "n" ? "\n" : (next || "");
      index += 2;
      continue;
    }
    value += char;
    index += 1;
  }
  return [value, index];
}

function coerceToken(token) {
  if (/^-?\d+$/.test(token)) return Number.parseInt(token, 10);
  if (/^-?(?:\d*\.\d+|\d+\.\d*)$/.test(token)) return Number.parseFloat(token);
  return token;
}

function parseList(input, start) {
  const values = [];
  let index = start + 1;
  while (index < input.length) {
    const char = input[index];
    if (/\s|,/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "]") return [values, index + 1];
    if (char === "[") {
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
    let token = "";
    while (index < input.length && !/[\s,\[\]]/.test(input[index])) {
      token += input[index];
      index += 1;
    }
    values.push(coerceToken(token));
  }
  return [values, index];
}

function stringToArgs(input) {
  const args = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "[") {
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
    let token = "";
    while (index < input.length && !/[\s\[\]]/.test(input[index])) {
      token += input[index];
      index += 1;
    }
    args.push(coerceToken(token));
  }
  return args;
}

function format(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function run(code, input) {
  const prints = [];
  const print = (...values) => prints.push(values.map(format).join(" "));
  const factory = new Function(
    "InvokeEngine",
    "Command",
    "meta",
    "stringToArgs",
    "string_to_args",
    "print",
    '"use strict";\n' + code + '\nreturn typeof engine !== "undefined" ? engine : undefined;'
  );
  const engine = factory(InvokeEngine, Command, meta, stringToArgs, stringToArgs, print);

  if (!(engine instanceof InvokeEngine)) {
    throw new Error('The snippet must define const engine = new InvokeEngine();');
  }

  const parsed = stringToArgs(input);
  const [command, args, callstack] = engine.parse(parsed);

  if (!command) {
    return {
      prints,
      parsed,
      args,
      callstack: [],
      command: null,
      result: "No command was found.",
    };
  }

  return {
    prints,
    parsed,
    args,
    callstack: callstack.map((item) => item.name),
    command: command.name,
    result: command.invoke(args, { engine }),
  };
}

window.parent.postMessage({ source: "invokify-demo-frame", ready: true }, "*");

window.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || message.source !== "invokify-demo-parent") return;

  try {
    const result = run(message.code, message.input);
    window.parent.postMessage({
      source: "invokify-demo-frame",
      id: message.id,
      input: message.input,
      ...result,
    }, "*");
  } catch (error) {
    window.parent.postMessage({
      source: "invokify-demo-frame",
      id: message.id,
      input: message.input,
      error: error instanceof Error ? error.message : String(error),
    }, "*");
  }
});
</scr` + `ipt>
</body>
</html>`;

function formatValue(value: unknown): string {
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return value;
	return JSON.stringify(value, null, 2);
}

function formatResult(message: SandboxResult): string {
	const details = [
		`parsed: ${formatValue(message.parsed ?? [])}`,
		`command: ${message.command ?? 'none'}`,
		`args: ${formatValue(message.args ?? [])}`,
	];

	if (message.callstack && message.callstack.length > 0) {
		details.push(`callstack: ${message.callstack.join(' -> ')}`);
	}

	const output = [...(message.prints ?? [])];
	if (message.result !== undefined) output.push(formatValue(message.result));

	return [...details, '', ...output].join('\n');
}

export default function InvokifySandbox() {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const requestId = useRef(0);
	const [activeDemoId, setActiveDemoId] = useState(demos[0].id);
	const activeDemo = useMemo(
		() => demos.find((demo) => demo.id === activeDemoId) ?? demos[0],
		[activeDemoId],
	);
	const [code, setCode] = useState(activeDemo.code);
	const [input, setInput] = useState(activeDemo.defaultInput);
	const [isReady, setIsReady] = useState(false);
	const [transcript, setTranscript] = useState<TranscriptLine[]>([
		{ type: 'note', text: 'Pick an example, edit the snippet if you want, then run a command.' },
	]);

	useEffect(() => {
		setCode(activeDemo.code);
		setInput(activeDemo.defaultInput);
		setTranscript([{ type: 'note', text: activeDemo.description }]);
	}, [activeDemo]);

	useEffect(() => {
		function handleMessage(event: MessageEvent<SandboxResult & { ready?: boolean }>) {
			const message = event.data;
			if (!message || message.source !== 'invokify-demo-frame') return;
			if (message.ready) {
				setIsReady(true);
				return;
			}

			setTranscript((current) => [
				...current,
				{ type: 'input', text: `$ ${message.input}` },
				message.error
					? { type: 'error', text: message.error }
					: { type: 'output', text: formatResult(message) },
			]);
		}

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, []);

	function runCommand(commandInput = input) {
		const trimmedInput = commandInput.trim();
		if (!trimmedInput || !iframeRef.current?.contentWindow) return;

		requestId.current += 1;
		iframeRef.current.contentWindow.postMessage(
			{
				source: 'invokify-demo-parent',
				id: requestId.current,
				code,
				input: trimmedInput,
			},
			'*',
		);
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		runCommand();
	}

	return (
		<section className="invokify-sandbox" aria-label="Interactive Invokify demo">
			<iframe
				ref={iframeRef}
				title="Invokify sandbox runtime"
				sandbox="allow-scripts"
				srcDoc={sandboxHtml}
				onLoad={() => setIsReady(true)}
				className="invokify-sandbox__frame"
			/>

			<div className="invokify-sandbox__header">
				<div>
					<p className="invokify-sandbox__eyebrow">Interactive demo</p>
					<h3>Try the parser without installing anything</h3>
				</div>
				<span className={`invokify-sandbox__status ${isReady ? 'is-ready' : ''}`}>
					{isReady ? 'Sandbox ready' : 'Starting sandbox'}
				</span>
			</div>

			<div className="invokify-sandbox__tabs" role="tablist" aria-label="Invokify demo examples">
				{demos.map((demo) => (
					<button
						key={demo.id}
						type="button"
						role="tab"
						aria-selected={activeDemo.id === demo.id}
						className={activeDemo.id === demo.id ? 'is-active' : ''}
						onClick={() => setActiveDemoId(demo.id)}
					>
						{demo.title}
					</button>
				))}
			</div>

			<div className="invokify-sandbox__grid">
				<label className="invokify-sandbox__editor">
					<span>Editable snippet</span>
					<textarea
						value={code}
						onChange={(event) => setCode(event.target.value)}
						spellCheck={false}
						rows={22}
						aria-label="Editable Invokify JavaScript snippet"
					/>
				</label>

				<div className="invokify-sandbox__terminal">
					<div className="invokify-sandbox__terminal-output" aria-live="polite">
						{transcript.map((line, index) => (
							<pre key={`${line.type}-${index}`} className={`is-${line.type}`}>
								{line.text}
							</pre>
						))}
					</div>

					<form onSubmit={handleSubmit} className="invokify-sandbox__prompt">
						<span aria-hidden="true">$</span>
						<input
							value={input}
							onChange={(event) => setInput(event.target.value)}
							placeholder="greet Mason"
							aria-label="Command input"
						/>
						<button type="submit" disabled={!isReady}>
							Run
						</button>
					</form>

					<div className="invokify-sandbox__examples" aria-label="Example commands">
						{activeDemo.exampleInputs.map((example) => (
							<button
								key={example}
								type="button"
								onClick={() => {
									setInput(example);
									runCommand(example);
								}}
								disabled={!isReady}
							>
								{example}
							</button>
						))}
					</div>
				</div>
			</div>

			<style>{`
				.invokify-sandbox {
					margin: 2rem 0;
					padding: 1rem;
					border: 1px solid var(--border);
					border-radius: 20px;
					background: color-mix(in srgb, var(--card) 92%, var(--accent-soft));
					box-shadow: 0 12px 40px var(--shadow);
				}

				.invokify-sandbox__frame {
					position: absolute;
					width: 1px;
					height: 1px;
					opacity: 0;
					pointer-events: none;
				}

				.invokify-sandbox__header {
					display: flex;
					align-items: flex-start;
					justify-content: space-between;
					gap: 1rem;
					margin-bottom: 1rem;
				}

				.invokify-sandbox__header h3 {
					margin: 0;
				}

				.invokify-sandbox__eyebrow {
					margin: 0 0 0.25rem;
					font-size: 0.78rem;
					font-weight: 700;
					letter-spacing: 0.12em;
					text-transform: uppercase;
					color: var(--accent);
				}

				.invokify-sandbox__status {
					flex-shrink: 0;
					padding: 0.35rem 0.7rem;
					border: 1px solid var(--border);
					border-radius: 999px;
					font-size: 0.78rem;
					color: var(--muted);
					background: var(--card);
				}

				.invokify-sandbox__status.is-ready {
					color: var(--accent);
					border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
				}

				.invokify-sandbox__tabs,
				.invokify-sandbox__examples {
					display: flex;
					flex-wrap: wrap;
					gap: 0.5rem;
				}

				.invokify-sandbox button {
					border: 1px solid var(--border);
					border-radius: 999px;
					padding: 0.45rem 0.75rem;
					color: var(--text);
					background: var(--card);
					font: inherit;
					font-size: 0.85rem;
					cursor: pointer;
				}

				.invokify-sandbox button:hover:not(:disabled),
				.invokify-sandbox button.is-active {
					border-color: var(--accent);
					color: var(--accent);
				}

				.invokify-sandbox button:disabled {
					cursor: not-allowed;
					opacity: 0.55;
				}

				.invokify-sandbox__grid {
					display: grid;
					grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
					gap: 1rem;
					margin-top: 1rem;
				}

				.invokify-sandbox__editor,
				.invokify-sandbox__terminal {
					min-width: 0;
				}

				.invokify-sandbox__editor span {
					display: block;
					margin-bottom: 0.45rem;
					font-size: 0.85rem;
					font-weight: 700;
					color: var(--muted);
				}

				.invokify-sandbox__editor textarea,
				.invokify-sandbox__terminal-output {
					width: 100%;
					border: 1px solid color-mix(in srgb, var(--border) 65%, #000);
					border-radius: 14px;
					background: #0f172a;
					color: #e2e8f0;
					font: 0.82rem/1.55 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
						'Liberation Mono', 'Courier New', monospace;
				}

				.invokify-sandbox__editor textarea {
					display: block;
					min-height: 520px;
					padding: 1rem;
					resize: vertical;
					tab-size: 2;
				}

				.invokify-sandbox__editor textarea:focus,
				.invokify-sandbox__prompt input:focus {
					outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
					outline-offset: 2px;
				}

				.invokify-sandbox__terminal {
					display: flex;
					flex-direction: column;
					gap: 0.75rem;
				}

				.invokify-sandbox__terminal-output {
					min-height: 420px;
					max-height: 520px;
					margin: 0;
					padding: 1rem;
					overflow: auto;
				}

				.invokify-sandbox__terminal-output pre {
					margin: 0 0 0.85rem;
					white-space: pre-wrap;
					word-break: break-word;
				}

				.invokify-sandbox__terminal-output pre:last-child {
					margin-bottom: 0;
				}

				.invokify-sandbox__terminal-output .is-input {
					color: #fbbf24;
				}

				.invokify-sandbox__terminal-output .is-error {
					color: #fca5a5;
				}

				.invokify-sandbox__terminal-output .is-note {
					color: #93c5fd;
				}

				.invokify-sandbox__prompt {
					display: flex;
					align-items: center;
					gap: 0.5rem;
					padding: 0.45rem;
					border: 1px solid var(--border);
					border-radius: 14px;
					background: var(--card);
				}

				.invokify-sandbox__prompt span {
					padding-left: 0.5rem;
					color: var(--accent);
					font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
						'Liberation Mono', 'Courier New', monospace;
				}

				.invokify-sandbox__prompt input {
					flex: 1;
					min-width: 0;
					border: 0;
					background: transparent;
					color: var(--text);
					font: inherit;
				}

				.invokify-sandbox__prompt button {
					color: #fff;
					background: var(--accent);
					border-color: var(--accent);
				}

				@media (max-width: 900px) {
					.invokify-sandbox__grid {
						grid-template-columns: 1fr;
					}

					.invokify-sandbox__editor textarea {
						min-height: 360px;
					}

					.invokify-sandbox__terminal-output {
						min-height: 320px;
					}
				}

				@media (max-width: 620px) {
					.invokify-sandbox {
						padding: 0.75rem;
					}

					.invokify-sandbox__header {
						flex-direction: column;
					}

					.invokify-sandbox__prompt {
						flex-wrap: wrap;
					}

					.invokify-sandbox__prompt input {
						flex-basis: calc(100% - 2rem);
					}
				}
			`}</style>
		</section>
	);
}
