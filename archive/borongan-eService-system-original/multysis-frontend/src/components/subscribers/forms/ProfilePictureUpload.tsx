import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import React from 'react';
import { FiUpload, FiUser } from 'react-icons/fi';

interface ProfilePictureUploadProps {
  previewImage?: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  previewImage,
  onImageChange,
  disabled = false,
}) => {
  return (
    <div className={cn("md:col-span-3 flex justify-center md:justify-start") }>
      <div className={cn("relative group w-48 h-48") }>
        <div className={cn("w-full h-full rounded-lg bg-primary-100 flex items-center justify-center overflow-hidden border-4 border-primary-300 shadow-lg") }>
          {previewImage ? (
            <img 
              src={previewImage} 
              alt="Profile preview" 
              className={cn("w-full h-full object-cover") }
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-user-icon')) {
                  const icon = document.createElement('div');
                  icon.className = 'fallback-user-icon w-full h-full flex items-center justify-center';
                  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  svg.setAttribute('class', 'w-16 h-16 text-primary-600');
                  svg.setAttribute('fill', 'none');
                  svg.setAttribute('stroke', 'currentColor');
                  svg.setAttribute('viewBox', '0 0 24 24');
                  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  path.setAttribute('stroke-linecap', 'round');
                  path.setAttribute('stroke-linejoin', 'round');
                  path.setAttribute('stroke-width', '2');
                  path.setAttribute('d', 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z');
                  svg.appendChild(path);
                  icon.appendChild(svg);
                  parent.appendChild(icon);
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-primary-600">
              <FiUser size={64} />
              <span className="text-xs mt-2 text-gray-500">No image</span>
            </div>
          )}
        </div>
        {/* Upload Button Overlay */}
        <label 
          htmlFor="picture"
          className={cn("absolute inset-0 w-48 h-48 rounded-lg bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center cursor-pointer transition-all duration-200") }
        >
          <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center") }>
            <div className={cn("bg-primary-600 p-4 rounded-lg mb-2") }>
              <FiUpload size={24} className="text-white" />
            </div>
            <span className={cn("text-white text-sm font-medium") }>Upload Photo</span>
          </div>
          <Input
            id="picture"
            type="file"
            accept="image/*"
            className={cn("hidden") }
            onChange={onImageChange}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
};


