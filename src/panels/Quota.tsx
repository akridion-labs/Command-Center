import { useEffect, useState } from 'react';
import { get } from '../api';
import { NotBuilt } from './NotBuilt';
import type { Quota } from '../endpoints';

export function Quota() {
  const [data, setData] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await get<Quota>('/vyom/quota');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="panel loading">Loading quota...</div>;
  if (error) return <div className="panel error">Error: {error}</div>;
  if (!data) return <div className="panel error">No data</div>;

  if (!data.built) {
    return <NotBuilt data={data} />;
  }

  return (
    <div className="panel quota">
      <h2>Quota</h2>
      <div className="quota-section">
        <div className="quota-item">
          <span className="label">Total Storage:</span>
          <span className="value">{data.storage.total} bytes</span>
        </div>
        <div className="quota-item">
          <span className="label">Used Storage:</span>
          <span className="value">{data.storage.used} bytes</span>
        </div>
        <div className="quota-item">
          <span className="label">Free Storage:</span>
          <span className="value">{data.storage.free} bytes</span>
        </div>
        <div className="quota-item">
          <span className="label">Chunks:</span>
          <span className="value">{data.usage.chunks}</span>
        </div>
        <div className="quota-item">
          <span className="label">Files:</span>
          <span className="value">{data.usage.files}</span>
        </div>
        <div className="quota-item">
          <span className="label">Documents:</span>
          <span className="value">{data.usage.documents}</span>
        </div>
      </div>
    </div>
  );
}