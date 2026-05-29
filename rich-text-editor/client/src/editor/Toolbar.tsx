import { useEffect, useState } from 'react';
import { commands, TOOLBAR_GROUPS } from './commands';
import type { EditorContext } from './commands';

interface Props {
  ctx: EditorContext | null;
  /** Bumps whenever selection or content changes; used to recompute isActive. */
  tick: number;
}

export function Toolbar({ ctx, tick }: Props) {
  const [, force] = useState(0);
  useEffect(() => { force((n) => n + 1); }, [tick]);

  const onMouseDown = (e: React.MouseEvent) => {
    // Prevent the toolbar from stealing the editor's selection.
    e.preventDefault();
  };

  return (
    <div className="toolbar" onMouseDown={onMouseDown} role="toolbar" aria-label="Formatting">
      {TOOLBAR_GROUPS.map((group, gi) => (
        <div className="tb-group" key={gi}>
          {group.map((id) => {
            const cmd = commands[id];
            if (!cmd) return null;
            const active = ctx && cmd.isActive ? cmd.isActive(ctx) : false;
            return (
              <button
                key={id}
                type="button"
                className={`tb-btn${active ? ' active' : ''}`}
                title={cmd.shortcut ? `${cmd.label} (${cmd.shortcut})` : cmd.label}
                aria-label={cmd.label}
                aria-pressed={active}
                disabled={!ctx}
                onClick={() => ctx && cmd.run(ctx)}
              >
                {cmd.icon}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
