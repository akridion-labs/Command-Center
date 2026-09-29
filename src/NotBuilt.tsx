import { Panel } from './api';

interface NotBuiltProps {
  panel: Panel<unknown>;
}

export function NotBuilt({ panel }: NotBuiltProps) {
  if (panel.built) {
    // This should never happen, but for type safety
    return null;
  }

  return (
    <div className="not-built">
      <h3>NOT BUILT</h3>
      <p>{panel.why}</p>
    </div>
  );
}