import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // The app should render without throwing an error
    expect(screen.getByText(/Vyom Command Center/i)).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<App />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});