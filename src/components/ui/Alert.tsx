// src/components/ui/Alert.tsx
import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export const Alert: React.FC<AlertProps> = ({ 
  children, 
  className = '', 
  variant = 'default', 
  ...props 
}) => {
  const variants = {
    default: 'bg-gray-50 text-gray-900',
    destructive: 'bg-red-50 text-red-900'
  };

  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <div
    className={`text-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);