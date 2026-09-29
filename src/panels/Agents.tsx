import { useEffect, useState } from 'react';
import { get } from '../api';
import { NotBuilt } from './NotBuilt';
import type { Agents } from '../endpoints';

export function Agents() {
  const [data, setData] = useState<Agents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await get<Agents>('/vyom/agents');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="panel loading">Loading agents...</div>;
  if (error) return <div className="panel error">Error: {error}</div>;
  if (!data) return <div className="panel error">No data</div>;

  if (!data.built) {
    return <NotBuilt data={data} />;
  }

  return (
    <div className="panel agents">
      <h2>Agents</h2>
      <div className="agents-list">
        {data.items.map((agent) => (
          <div key={agent.id} className="agent-item">
            <div className="agent-header">
              <span className="agent-name">{agent.name}</span>
              <span className={`status ${agent.status}`}>
                {agent.status}
              </span>
            </div>
            <div className="agent-details">
              <p>Version: {agent.version}</p>
              <p>Last seen: {new Date(agent.last_seen).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}