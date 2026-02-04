import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Skill = { name: string; complete: boolean };
type Node = { name: string; skills: Skill[] };
type Path = { name: string; nodes: Node[] };

type Props = {
	paths: Path[];
};

function getCompletion(node: Node) {
	const total = node.skills.length;
	const completed = node.skills.filter((skill) => skill.complete).length;
	return total === 0 ? 0 : Math.round((completed / total) * 100);
}

const CheckIcon = ({ completed }: { completed: boolean }) => (
	<svg 
		width="16" 
		height="16" 
		viewBox="0 0 16 16" 
		fill="none"
		style={{ 
			flexShrink: 0,
			color: completed ? 'var(--accent)' : 'var(--muted)'
		}}
	>
		{completed ? (
			<>
				<rect width="16" height="16" rx="4" fill="currentColor" />
				<path 
					d="M4 8L7 11L12 5" 
					stroke="white" 
					strokeWidth="2" 
					strokeLinecap="round" 
					strokeLinejoin="round"
				/>
			</>
		) : (
			<rect 
				width="16" 
				height="16" 
				rx="4" 
				stroke="currentColor" 
				strokeWidth="2"
			/>
		)}
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
			{paths.map((path) => {
				const completions = path.nodes.map(node => getCompletion(node));
				
				return (
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
							{path.nodes.map((node, index) => {
								const percent = completions[index];
								const nodeKey = `${path.name}-${node.name}`;
								const isActive = activeNode === nodeKey;
								const isComplete = percent === 100;
								const hasProgress = percent > 0;
								
								// Determine line color - green if both this and previous node are complete
								const showLine = index > 0;
								const prevComplete = completions[index - 1] === 100;
								const lineColor = isComplete && prevComplete ? 'var(--accent)' : 'var(--border)';
								
								return (
									<div 
										key={nodeKey}
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
										{/* Connecting line */}
										{showLine && (
											<div
												style={{
													position: 'absolute',
													left: 'calc(-50% - 1rem)',
													top: '30px',
													width: 'calc(100% + 2rem)',
													height: '3px',
													background: lineColor,
													zIndex: 0
												}}
											/>
										)}
										
										{/* Node circle */}
										<div
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
												background: isComplete 
													? 'var(--accent)' 
													: !hasProgress
													? 'var(--border)'
													: `conic-gradient(var(--accent) ${percent}%, var(--border) 0)`,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												boxShadow: isActive ? '0 4px 16px rgba(0, 0, 0, 0.15)' : 'none'
											}}
										>
											{/* Inner circle */}
											{!isComplete && (
												<div
													style={{
														width: '48px',
														height: '48px',
														borderRadius: '50%',
														background: 'var(--card)',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontSize: '0.85rem',
														fontWeight: 600,
														color: hasProgress ? 'var(--accent)' : 'var(--muted)'
													}}
												>
													{percent}%
												</div>
											)}
											{isComplete && (
												<svg
													width="32"
													height="32"
													viewBox="0 0 24 24"
													fill="none"
													stroke="white"
													strokeWidth="3"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<polyline points="20 6 9 17 4 12" />
												</svg>
											)}
										</div>
										
										{/* Node label */}
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
				);
			})}
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
						minWidth: '220px',
						maxWidth: '280px',
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
					<div style={{ 
						display: 'flex', 
						flexDirection: 'column',
						gap: '0.5rem'
					}}>
						{activeTooltip.node.skills.map((skill) => (
							<div 
								key={skill.name}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									fontSize: '0.85rem',
									color: 'var(--text)'
								}}
							>
								<CheckIcon completed={skill.complete} />
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
