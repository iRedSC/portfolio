import { useState } from 'react';

interface SkillNode {
  id: string;
  name: string;
  level: number;
  dependencies?: string[];
  description?: string;
}

interface SkillPathProps {
  path: {
    id: string;
    name: string;
    description: string;
    nodes: SkillNode[];
  };
}

export default function SkillPath({ path }: SkillPathProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const maxLevel = Math.max(...path.nodes.map(node => node.level));
  const sortedNodes = [...path.nodes].sort((a, b) => a.level - b.level);

  return (
    <div style={{ marginBottom: '3rem' }}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)', textAlign: 'center' }}>
        {path.name}
      </h3>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        {path.description}
      </p>

      <div style={{ position: 'relative', padding: '2rem 0' }}>
        {/* Connection line */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {sortedNodes.map((node, index) => {
            if (index === 0) return null;
            const prevNode = sortedNodes[index - 1];
            const x1 = (index - 1) / (sortedNodes.length - 1) * 100;
            const x2 = index / (sortedNodes.length - 1) * 100;
            const y1 = 100 - (prevNode.level / maxLevel) * 60;
            const y2 = 100 - (node.level / maxLevel) * 60;

            return (
              <line
                key={`line-${node.id}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {sortedNodes.map((node, index) => {
            const heightPercent = (node.level / maxLevel) * 100;

            return (
              <div
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  flex: '1',
                }}
              >
                {/* Node circle */}
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: `conic-gradient(var(--accent) ${heightPercent}%, var(--border) 0)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    transform: hoveredNode === node.id ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: hoveredNode === node.id ? '0 4px 16px rgba(0, 0, 0, 0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--accent)',
                    }}
                  >
                    {node.level}
                  </div>
                </div>

                {/* Node label */}
                <div
                  style={{
                    marginTop: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    color: 'var(--text)',
                    textAlign: 'center',
                    maxWidth: '80px',
                  }}
                >
                  {node.name}
                </div>

                {/* Tooltip */}
                {hoveredNode === node.id && node.description && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-80px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      minWidth: '200px',
                      maxWidth: '250px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                      zIndex: 10,
                      fontSize: '0.85rem',
                      color: 'var(--text)',
                      lineHeight: '1.4',
                    }}
                  >
                    {node.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}