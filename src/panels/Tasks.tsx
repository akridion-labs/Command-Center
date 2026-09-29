import { useEffect, useState } from 'react';
import { get } from '../api';
import { NotBuilt } from './NotBuilt';
import type { Tasks } from '../endpoints';

export function Tasks() {
  const [data, setData] = useState<Tasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await get<Tasks>('/vyom/tasks');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="panel loading">Loading tasks...</div>;
  if (error) return <div className="panel error">Error: {error}</div>;
  if (!data) return <div className="panel error">No data</div>;

  if (!data.built) {
    return <NotBuilt data={data} />;
  }

  return (
    <div className="panel tasks">
      <h2>Tasks</h2>
      <div className="tasks-section">
        <ul className="task-list">
          {data.items.map((task) => (
            <li key={task.id} className="task-item">
              <div className="task-header">
                <span className="task-name">{task.name}</span>
                <span className={`status ${task.status}`}>
                  {task.status}
                </span>
              </div>
              <div className="task-details">
                <p>Created: {new Date(task.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}