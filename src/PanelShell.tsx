import type { ReactNode } from 'react';
import type { Panel } from './api';
import { NotBuilt } from './NotBuilt';

export interface PanelProps<T> {
  panel: Panel<T> | null;
  title: string;
  children?: (panel: Panel<T>) => ReactNode;
}

export function PanelShell<T>({ panel, title, children }: PanelProps<T>) {
  if (panel === null) {
    return (
      <div className="panel">
        <h2>{title}</h2>
        <div className="card-note">loading…</div>
      </div>
    );
  }

  if (!panel.built) {
    return (
      <div className="panel">
        <h2>{title}</h2>
        <NotBuilt panel={panel} />
      </div>
    );
  }

  // When panel is built, pass it to children function
  if (children && typeof children === 'function') {
    return (
      <div className="panel">
        <h2>{title}</h2>
        {children(panel)}
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>{title}</h2>
      {children}
    </div>
  );
}