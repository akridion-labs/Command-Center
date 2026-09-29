import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { HealthPanel, TasksPanel, AgentsPanel, QuotaPanel, ContainersPanel, ActionsPanel } from './Panels'

afterEach(cleanup)

describe('panels render from their endpoint', () => {
  it('health', () => {
    const { getByText } = render(<HealthPanel panel={{ built: true, model: 'qwen3', attention: [{ name: 'index stale' }] }} />)
    expect(getByText('qwen3')).toBeTruthy()
    expect(getByText('index stale')).toBeTruthy()
  })
  it('tasks', () => {
    const { getByText } = render(<TasksPanel panel={{ built: true, jobs: [{ name: 'job-1' }], packets: [], deferred: [] }} />)
    expect(getByText('job-1')).toBeTruthy()
    expect(getByText('no packets')).toBeTruthy()
  })
  it('agents', () => {
    const { getByText } = render(<AgentsPanel panel={{ built: true, agents: [{ name: 'dev' }] }} />)
    expect(getByText('dev')).toBeTruthy()
  })
  it('quota: storage real, usage NOT BUILT', () => {
    const { getByText } = render(<QuotaPanel panel={{ built: true, storage: { size: '1.2 GB' }, usage: { built: false, why: 'no telemetry yet' } }} />)
    expect(getByText('1.2 GB')).toBeTruthy()
    expect(getByText('NOT BUILT')).toBeTruthy()
    expect(getByText('no telemetry yet')).toBeTruthy()
  })
  it('containers NOT BUILT shows why, never an empty list', () => {
    const { getByText, container } = render(<ContainersPanel panel={{ built: false, why: 'nothing is containerised' }} />)
    expect(getByText('NOT BUILT')).toBeTruthy()
    expect(getByText('nothing is containerised')).toBeTruthy()
    expect(container.querySelector('ul')).toBeNull()
  })
  it('actions NOT BUILT', () => {
    const { getByText } = render(<ActionsPanel />)
    expect(getByText('NOT BUILT')).toBeTruthy()
    expect(getByText(/501/)).toBeTruthy()
  })
  it('a not-built health panel renders NOT BUILT', () => {
    const { getByText } = render(<HealthPanel panel={{ built: false, why: 'health down' }} />)
    expect(getByText('NOT BUILT')).toBeTruthy()
  })
})
