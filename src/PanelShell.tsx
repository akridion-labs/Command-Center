import { ReactNode } from 'react';
import { Panel } from './api';

export interface PanelProps<T> {
  panel: Panel<T>;
  title: string;
  children?: ReactNode;
}

export function PanelShell<T>({ panel, title, children }: PanelProps<T>) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      {children}
    </div>
  );
}