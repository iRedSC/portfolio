import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Skill = { name: string; amount?: number };
type Node = { name: string; amount: number; skills: Skill[] };
type Path = { name: string; nodes: Node[] };

type Props = {
	paths: Path[];
};

/** Returns 1–4 for the node progress state (from group amount). */
function getNodeAmount(node: Node): number {
	return Math.max(1, Math.min(4, node.amount ?? 1));
}

const BookIcon = () => (
	<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
		<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
		<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
		<path d="M8 7h8" />
		<path d="M8 11h8" />
	</svg>
);

const MagnifierIcon = () => (
	<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.35-4.35" />
	</svg>
);

const RocketIcon = () => (
	<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
		<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
		<path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
		<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
		<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
	</svg>
);

const StarIcon = () => (
	<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
		<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
	</svg>
);

const NODE_ICONS: Record<1 | 2 | 3 | 4, () => JSX.Element> = {
	1: MagnifierIcon,
	2: BookIcon,
	3: RocketIcon,
	4: StarIcon,
};

const NODE_STAGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
	1: 'Researching',
	2: 'Learning',
	3: 'Utilizing',
	4: 'Mastered',
};

export default function SkillPaths({ paths }: Props) {
	const [activeNode, setActiveNode] = useState<string | null>(null);
	const [activeTooltip, setActiveTooltip] = useState<{
		key: string;
		node: Node;
		element: HTMLDivElement;
	} | null>(null);
	const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
	const [iconTooltip, setIconTooltip] = useState<{
		key: string;
		amount: 1 | 2 | 3 | 4;
		element: HTMLDivElement;
	} | null>(null);
	const [iconTooltipRect, setIconTooltipRect] = useState<DOMRect | null>(null);
	const [iconHovered, setIconHovered] = useState<string | null>(null);

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

	useLayoutEffect(() => {
		if (!iconTooltip) return;

		const updateRect = () => {
			setIconTooltipRect(iconTooltip.element.getBoundingClientRect());
		};

		updateRect();
		window.addEventListener('scroll', updateRect, true);
		window.addEventListener('resize', updateRect);

		return () => {
			window.removeEventListener('scroll', updateRect, true);
			window.removeEventListener('resize', updateRect);
		};
	}, [iconTooltip]);

	const maxNodes = Math.max(...paths.map((p) => p.nodes.length), 1);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'visible' }}>
			{paths.map((path) => {
				const sortedNodes = [...path.nodes].sort((a, b) => getNodeAmount(b) - getNodeAmount(a));
				return (
					<div
						key={path.name}
						className="skill-nodes-container"
						style={{
							overflowX: 'auto',
							overflowY: 'visible',
							padding: '0.5rem 0',
						}}
					>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: `8rem repeat(${maxNodes}, minmax(0, 1fr))`,
								alignItems: 'center',
								gap: '1rem',
								paddingTop: '0.75rem',
								paddingBottom: '0.75rem',
								overflow: 'visible',
								minWidth: 0,
							}}
						>
						<h3 style={{
							fontSize: '1.125rem',
							margin: 0,
							color: 'var(--text)',
							fontWeight: 600,
						}}>
							{path.name}
						</h3>
						{Array.from({ length: maxNodes }, (_, i) => {
							const node = sortedNodes[i];
							if (!node) {
								return <div key={`empty-${i}`} />;
							}
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
										justifyContent: 'flex-start',
										gap: '0.375rem',
										minWidth: 0,
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
											width: '44px',
											height: '44px',
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
											className={`skill-path-node-inner ${iconHovered === nodeKey ? 'skill-path-icon-hover' : ''}`}
											onMouseEnter={(e) => {
												e.stopPropagation();
												setIconTooltip({
													key: nodeKey,
													amount: amount as 1 | 2 | 3 | 4,
													element: e.currentTarget,
												});
												setIconHovered(nodeKey);
											}}
											onMouseLeave={() => {
												setIconTooltip(null);
												setIconTooltipRect(null);
												setIconHovered(null);
											}}
											style={{
												width: '34px',
												height: '34px',
												borderRadius: '50%',
												background: 'var(--card)',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: amount >= 3 ? 'var(--accent)' : 'var(--muted)',
											}}
										>
											<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.8)' }}>
												{NODE_ICONS[amount as 1 | 2 | 3 | 4]()}
											</div>
										</div>
									</div>

									<div
										style={{
											fontSize: '0.75rem',
											fontWeight: 500,
											color: 'var(--text)',
											textAlign: 'center',
											maxWidth: '100%'
										}}
									>
										{node.name}
									</div>
								</div>
							);
						})}
						</div>
					</div>
				);
			})}
			{activeTooltip && tooltipRect && createPortal(
				<div
					className="skill-path-tooltip skill-path-tooltip-enter"
					style={{
						position: 'fixed',
						top: `${tooltipRect.bottom + 12}px`,
						left: `${tooltipRect.left + tooltipRect.width / 2}px`,
						transform: 'translateX(-50%)',
						background: 'var(--card)',
						border: '1px solid var(--border)',
						borderRadius: '12px',
						padding: '1rem',
						minWidth: '340px',
						maxWidth: '480px',
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
							gridAutoFlow: 'column',
							gridTemplateRows: `repeat(${Math.ceil(activeTooltip.node.skills.length / 2)}, auto)`,
							gap: '0.5rem 1rem',
							fontSize: '0.85rem',
							color: 'var(--text)',
						}}
					>
						{[...activeTooltip.node.skills]
							.map((skill) => {
								const amount = skill.amount != null ? Math.max(1, Math.min(4, skill.amount)) as 1 | 2 | 3 | 4 : 4;
								return { ...skill, amount };
							})
							.sort((a, b) => b.amount - a.amount)
							.map((skill) => {
								const amount = skill.amount;
								const Icon = NODE_ICONS[amount];
								return (
									<div
										key={skill.name}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '0.5rem',
										}}
									>
										<div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: amount >= 3 ? 'var(--accent)' : 'var(--muted)' }}>
											<div style={{ transform: 'scale(0.73)' }}>{Icon()}</div>
										</div>
										<span>{skill.name}</span>
									</div>
								);
							})}
					</div>
				</div>,
				document.body
			)}
			{iconTooltip && iconTooltipRect && createPortal(
				<div
					className="skill-path-icon-tooltip skill-path-icon-tooltip-enter"
					style={{
						position: 'fixed',
						top: `${iconTooltipRect.top - 18}px`,
						left: `${iconTooltipRect.left + iconTooltipRect.width / 2}px`,
						transform: 'translate(-50%, -100%)',
						background: 'var(--card)',
						border: '1px solid var(--border)',
						borderRadius: '8px',
						padding: '0.5rem 0.75rem',
						fontSize: '0.8rem',
						color: 'var(--text)',
						whiteSpace: 'nowrap',
						boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
						zIndex: 10000,
						pointerEvents: 'none',
					}}
				>
					{NODE_STAGE_LABELS[iconTooltip.amount]}
				</div>,
				document.body
			)}
		</div>
	);
}
