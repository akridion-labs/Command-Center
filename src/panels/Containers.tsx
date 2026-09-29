import { useEffect, useState } from 'react';
import { get } from '../api';
import { NotBuilt } from './NotBuilt';
import type { Containers } from '../endpoints';

export function Containers() {
  const [data, setData] = useState<Containers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await get<Containers>('/vyom/containers');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="panel loading">Loading containers...</div>;
  if (error) return <div className="panel error">Error: {error}</div>;
  if (!data) return <div className="panel error">No data</div>;

  if (!data.built) {
    return <NotBuilt data={data} />;
  }

  return (
    <div className="panel containers">
      <h2>Containers</h2>
      <div className="containers-list">
        {data.items.map((container) => (
          <div key={container.id} className="container-item">
            <div className="container-header">
              <span className="container-name">{container.name}</span>
              <span className={`status ${container.status}`}>
                {container.status}
              </span>
            </div>
            <div className="container-details">
              <p>Image: {container.image}</p>
              <p>Created: {new Date(container.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}