import { useState, useEffect } from 'react';
import './index.css';
import { get } from './api';
import { Health, Tasks, Agents, Quota, Containers } from './panels';
import { NotBuilt } from './panels/NotBuilt';
import { AskBox } from './components/AskBox';
import { Me } from './endpoints';

function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const data = await get<Me>('/vyom/me');
        if (data.built) {
          setMe(data);
        } else {
          setError(`Failed to load user info: ${data.why}`);
        }
      } catch (err) {
        setError('Failed to load user info');
        console.error(err);
      }
    };

    fetchMe();
  }, []);

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Vyom Command Center</h1>
        </header>
        <main className="app-main">
          <div className="app-error">{error}</div>
        </main>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Vyom Command Center</h1>
        </header>
        <main className="app-main">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Vyom Command Center</h1>
        <div className="user-info">
          <span>{me.options?.role}</span>
          {me.config_problem && (
            <span className="config-problem">⚠️ Config problem: {me.config_problem}</span>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="panel-grid">
          <Health />
          <Tasks />
          <Agents />
          <Quota />
          <Containers />
        </div>

        <AskBox />
      </main>
    </div>
  );
}

export default App;