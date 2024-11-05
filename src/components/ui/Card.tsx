// src/components/ui/Card.tsx
import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <div 
    className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`} 
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <div 
    className={`flex flex-col space-y-1.5 p-6 ${className}`} 
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <h3 
    className={`text-2xl font-semibold leading-none tracking-tight ${className}`} 
    {...props}
  >
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <div 
    className={`p-6 pt-0 ${className}`} 
    {...props}
  >
    {children}
  </div>
);