import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '../components/layout/AppLayout';
import { ExercisePage } from '../pages/ExercisePage';

// Test wrapper without Router (since components will be tested individually)
function TestWrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('App Components', () => {
  it('renders AppLayout without crashing', () => {
    render(
      <TestWrapper>
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      </TestWrapper>
    );
  });

  it('displays the app title in header', () => {
    render(
      <TestWrapper>
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      </TestWrapper>
    );
    expect(screen.getAllByText('CQL Code Clinic')).toHaveLength(2); // Header and sidebar
  });

  it('shows exercise page content', () => {
    render(
      <TestWrapper>
        <ExercisePage />
      </TestWrapper>
    );
    expect(screen.getByText('Exercise 1: Whitespace and Comments')).toBeInTheDocument();
  });
});