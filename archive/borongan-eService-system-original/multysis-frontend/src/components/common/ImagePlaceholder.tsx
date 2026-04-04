import React from 'react';

interface ImagePlaceholderProps {
  size?: 'small' | 'large';
  message?: string;
  className?: string;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  size = 'small',
  message = 'No image',
  className = '',
}) => {
  const iconSize = size === 'large' ? 'w-32 h-32' : 'w-16 h-16';
  const textSize = size === 'large' ? 'text-lg' : 'text-sm';
  const containerHeight = size === 'large' ? 'h-[70vh]' : 'h-full';

  return (
    <div className={`w-full ${containerHeight} flex flex-col items-center justify-center bg-gray-100 text-gray-400 rounded-xl ${className}`}>
      <svg className={`${iconSize} mb-${size === 'large' ? '4' : '2'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p className={`${textSize} text-gray-500`}>{message}</p>
    </div>
  );
};

export const ProfileImagePlaceholder: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center text-gray-400 ${className}`}>
      <svg className="w-32 h-32 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      <p className="text-lg font-medium">No profile picture available</p>
    </div>
  );
};


