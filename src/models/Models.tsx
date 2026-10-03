import { useEffect, useState } from 'react'
import { get, type Panel } from '../api'
import { PanelShell } from '../PanelShell'

interface Model {
  name: string
  default: boolean
}

interface BuildLoopEvidence {
  calls: number
  minutes: number
  slices_ok: number
  first_try: number
}

interface ModelsResponse {
  default: string
  models: Model[]
  build_loop_evidence: Record<string, BuildLoopEvidence>
}

export function ModelsPanel({ panel }: { panel: Panel<ModelsResponse> | null }) {
  return (
    <PanelShell title="Models" panel={panel}>
      {(p: Panel<ModelsResponse>) => {
        if (p.built === true) {
          return (
            <>
              <div className="card-note">Default model: {p.default}</div>
              <div className="card-note" style={{ marginTop: 12 }}>Available models:</div>
              <table className="model-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Default</th>
                    <th>Calls</th>
                    <th>Minutes</th>
                    <th>Slices OK</th>
                    <th>First Try %</th>
                  </tr>
                </thead>
                <tbody>
                  {p.models.map((model) => {
                    const evidence = p.build_loop_evidence[model.name];
                    return (
                      <tr key={model.name}>
                        <td>{model.name}</td>
                        <td>{model.default ? '✓' : ''}</td>
                        <td>{evidence?.calls ?? 0}</td>
                        <td>{evidence?.minutes ?? 0}</td>
                        <td>{evidence?.slices_ok ?? 0}</td>
                        <td>{evidence?.first_try ?? 0}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          );
        }
        return null;
      }}
    </PanelShell>
  );
}

function useModelsEndpoint(): Panel<ModelsResponse> | null {
  const [panel, setPanel] = useState<Panel<ModelsResponse> | null>(null);
  useEffect(() => {
    let live = true;
    get<ModelsResponse>('/vyom/models').then((p) => live && setPanel(p)).catch(() => live && setPanel({ built: false, why: '/vyom/models unreachable' }));
    return () => { live = false }
  }, []);
  return panel;
}

export function ModelsSection() {
  const panel = useModelsEndpoint();

  return (
    <div className="cd-grid">
      <div className="sp4 section-label" id="sec-models">Models</div>
      <ModelsPanel panel={panel} />
    </div>
  );
}