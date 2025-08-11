import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoading } from './components/LoadingStates';
import { ConnectionStatusToast } from './components/NetworkErrorHandler';
import { AppLayout } from './components/layout/AppLayout';
import { ExercisePage } from './pages/ExercisePage';
import { ProgressPage } from './pages/ProgressPage';
import { CQLTestPage } from './pages/CQLTestPage';
import { LearnPage } from './pages/LearnPage';
import { SettingsPage } from './pages/SettingsPage';

// Custom error handler for React Query
const queryErrorHandler = (error) => {
  console.error('Query Error:', error);
  
  // Don't show toast for network errors (handled by ConnectionStatusToast)
  if (error?.code !== 'NETWORK_ERROR' && navigator.onLine) {
    // Could integrate with toast system here if needed
  }
};

// Create a client with enhanced error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (except 429)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
          return false;
        }
        
        // Don't retry if offline
        if (!navigator.onLine) {
          return false;
        }
        
        // Retry up to 2 times for network errors and 5xx errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        
        // Don't retry if offline
        if (!navigator.onLine) {
          return false;
        }
        
        return failureCount < 1;
      },
      onError: queryErrorHandler,
    },
  },
});

function App() {
  return (
    <ErrorBoundary showDetails={import.meta.env.DEV}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<PageLoading message="Loading CQL Code Clinic..." />}>
            <ErrorBoundary>
              <AppLayout>
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <Suspense fallback={<PageLoading message="Loading exercise..." />}>
                        <ExercisePage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="/progress" 
                    element={
                      <Suspense fallback={<PageLoading message="Loading progress..." />}>
                        <ProgressPage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="/test-cql" 
                    element={
                      <Suspense fallback={<PageLoading message="Loading CQL tester..." />}>
                        <CQLTestPage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="/learn" 
                    element={
                      <Suspense fallback={<PageLoading message="Loading CQL documentation..." />}>
                        <LearnPage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <Suspense fallback={<PageLoading message="Loading settings..." />}>
                        <SettingsPage />
                      </Suspense>
                    } 
                  />
                </Routes>
              </AppLayout>
            </ErrorBoundary>
          </Suspense>
        </Router>
        
        {/* Global components */}
        <ConnectionStatusToast />
        
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;