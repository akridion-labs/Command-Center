import { Panel } from '../api'

interface NotBuiltProps {
  data: Panel<unknown>;
}

export function NotBuilt({ data }: NotBuiltProps) {
  if (data.built) {
    // This should never happen, but just in case
    return null;
  }

  return (
    <div className="panel not-built">
      <h2>NOT BUILT</h2>
      <p>{data.why}</p>
      {data.unblocked_by && (
        <p className="unblocked-by">Unblocked by: {data.unblocked_by}</p>
      )}
    </div>
  );
}