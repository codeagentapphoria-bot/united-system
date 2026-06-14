import React from 'react';

interface MaintenanceOverlayProps {
  message?: string;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  message,
}) => {
  const displayMessage =
    message ||
    (import.meta.env.VITE_MAINTENANCE_MESSAGE as string) ||
    'This section is under maintenance. Please try again later.';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="text-center px-6 max-w-md">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center">
            <span className="text-4xl text-yellow-500">&#9888;</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Under Maintenance
        </h1>

        {/* Message */}
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {displayMessage}
        </p>

        {/* Status badge */}
        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
          503 Service Unavailable
        </span>

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-400">
          If you believe this is an error, please contact the administrator.
        </p>
      </div>
    </div>
  );
};
