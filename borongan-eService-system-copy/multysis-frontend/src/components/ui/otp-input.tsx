// React imports
import React, { useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';

// UI Components (shadcn/ui)
import { Input } from '@/components/ui/input';

// Utils
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  className,
  error = false,
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  React.useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Focus the first empty input or the last input if all are filled
  const focusInput = (index: number) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
      setFocusedIndex(index);
    }
  };

  // Handle input change
  const handleChange = (index: number, newValue: string) => {
    // Only allow digits
    const digit = newValue.replace(/\D/g, '').slice(0, 1);
    
    if (digit) {
      const newOtp = value.split('');
      newOtp[index] = digit;
      const updatedOtp = newOtp.join('').slice(0, length);
      
      onChange(updatedOtp);
      
      // Move to next input if available
      if (index < length - 1) {
        focusInput(index + 1);
      } else {
        // All inputs filled, trigger onComplete
        if (updatedOtp.length === length && onComplete) {
          onComplete(updatedOtp);
        }
      }
    } else {
      // Clear current input
      const newOtp = value.split('');
      newOtp[index] = '';
      onChange(newOtp.join(''));
    }
  };

  // Handle key down
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[index]) {
        // Clear current input
        const newOtp = value.split('');
        newOtp[index] = '';
        onChange(newOtp.join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        focusInput(index - 1);
        const newOtp = value.split('');
        newOtp[index - 1] = '';
        onChange(newOtp.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  // Handle paste
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      onChange(pastedData);
      
      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedData.length, length - 1);
      focusInput(nextIndex);
      
      // If all inputs are filled, trigger onComplete
      if (pastedData.length === length && onComplete) {
        onComplete(pastedData);
      }
    }
  };

  // Handle focus
  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // Select all text when focused
    if (inputRefs.current[index]) {
      inputRefs.current[index]?.select();
    }
  };

  // Handle blur
  const handleBlur = () => {
    setFocusedIndex(null);
  };

  return (
    <div className={cn('flex gap-2 justify-center', className)}>
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            'w-12 h-12 text-center text-lg font-semibold',
            error && 'border-red-500 focus-visible:ring-red-500',
            focusedIndex === index && 'ring-2 ring-primary'
          )}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
};


