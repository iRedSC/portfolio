import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Skill = { name: string; amount: number };
type Node = { name: string; skills: Skill[] };
type Path = { name: string; nodes: Node[] };

type Props = {
	paths: Path[];
};

/** Returns 1–4 for the node progress state (average of skill amounts, rounded). */
function getNodeAmount(node: Node): number {
	if (!node.skills.length) return 1;
	const sum = node.skills.reduce((acc, s) => acc + (s.amount ?? 1), 0);
	const avg = sum / node.skills.length;
	return Math.max(1, Math.min(4, Math.round(avg)));
}

const CheckIcon = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="none"
		style={{ flexShrink: 0, color: 'var(--accent)' }}
	>
		<path
			d="M3 8l3.5 3.5L13 5"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export default function SkillPaths({ paths }: Props) {
	const [activeNode, setActiveNode] = useState<string | null>(null);
	const [activeTooltip, setActiveTooltip] = useState<{
		key: string;
		node: Node;
		element: HTMLDivElement;
	} | null>(null);
	const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);

	useLayoutEffect(() => {
		if (!activeTooltip) return;

		const updateRect = () => {
			setTooltipRect(activeTooltip.element.getBoundingClientRect());
		};

		updateRect();
		window.addEventListener('scroll', updateRect, true);
		window.addEventListener('resize', updateRect);

		return () => {
			window.removeEventListener('scroll', updateRect, true);
			window.removeEventListener('resize', updateRect);
		};
	}, [activeTooltip]);

	return (
		<div style={{ display: 'grid', gap: '3rem' }}>
			{paths.map((path) => (
				<div key={path.name}>
					<h3 style={{
						fontSize: '1.5rem',
						marginBottom: '2rem',
						color: 'var(--text)',
						fontWeight: 600,
						textAlign: 'center'
					}}>
						{path.name}
					</h3>

					<div
						className="skill-nodes-container"
						style={{
							position: 'relative',
							display: 'flex',
							alignItems: 'flex-start',
							gap: '2rem',
							padding: '2rem 1rem 6rem',
							overflowX: 'auto',
							overflowY: 'visible'
						}}
					>
						{path.nodes.map((node) => {
							const amount = getNodeAmount(node);
							const nodeKey = `${path.name}-${node.name}`;
							const isActive = activeNode === nodeKey;
							const fillPercent = (amount / 4) * 100;
							const fillColor = `color-mix(in srgb, var(--accent) ${fillPercent}%, var(--card))`;

							return (
								<div
									key={nodeKey}
									className="skill-path-node"
									style={{
										position: 'relative',
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.75rem',
										flex: '1 0 auto',
										minWidth: '80px'
									}}
								>
									<div
										className="skill-path-node-circle"
										onMouseEnter={(event) => {
											setActiveNode(nodeKey);
											setActiveTooltip({
												key: nodeKey,
												node,
												element: event.currentTarget,
											});
										}}
										onMouseLeave={() => {
											setActiveNode(null);
											setActiveTooltip(null);
											setTooltipRect(null);
										}}
										style={{
											position: 'relative',
											width: '60px',
											height: '60px',
											borderRadius: '50%',
											cursor: 'pointer',
											transition: 'transform 0.2s ease',
											transform: isActive ? 'scale(1.1)' : 'scale(1)',
											zIndex: 1,
											background: fillPercent === 0
												? 'var(--border)'
												: `conic-gradient(${fillColor} ${fillPercent}%, var(--border) 0)`,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											boxShadow: isActive ? '0 4px 16px rgba(0, 0, 0, 0.15)' : 'none'
										}}
									>
										<div
											className="skill-path-node-inner"
											style={{
												width: '48px',
												height: '48px',
												borderRadius: '50%',
												background: 'var(--card)',
											}}
										/>
									</div>

									<div
										style={{
											fontSize: '0.9rem',
											fontWeight: 500,
											color: 'var(--text)',
											textAlign: 'center',
											maxWidth: '120px'
										}}
									>
										{node.name}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			))}
			{activeTooltip && tooltipRect && createPortal(
				<div
					style={{
						position: 'fixed',
						top: `${tooltipRect.bottom + 12}px`,
						left: `${tooltipRect.left + tooltipRect.width / 2}px`,
						transform: 'translateX(-50%)',
						background: 'var(--card)',
						border: '1px solid var(--border)',
						borderRadius: '12px',
						padding: '1rem',
						minWidth: '280px',
						maxWidth: '380px',
						boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
						zIndex: 9999,
						pointerEvents: 'none',
					}}
				>
					<div style={{ 
						fontWeight: 600, 
						marginBottom: '0.75rem',
						color: 'var(--text)',
						fontSize: '0.95rem'
					}}>
						{activeTooltip.node.name}
					</div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '0.5rem 1rem',
							fontSize: '0.85rem',
							color: 'var(--text)',
						}}
					>
						{activeTooltip.node.skills.map((skill) => (
							<div
								key={skill.name}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
								}}
							>
								<CheckIcon />
								<span>{skill.name}</span>
							</div>
						))}
					</div>
				</div>,
				document.body
			)}
		</div>
	);
}
