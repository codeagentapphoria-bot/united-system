import React from 'react';
import type { FallbackProps } from 'react-error-boundary';

export const ErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-4">
          <span className="text-5xl" aria-hidden>⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try reloading the page.
        </p>
        {import.meta.env.DEV && error ? (
          <p className="text-xs text-red-500 mb-4 font-mono break-words">
            {String(error)}
          </p>
        ) : null}
        <button
          onClick={resetErrorBoundary ?? (() => window.location.reload())}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Reload page
        </button>
      </div>
    </div>
  );
};
