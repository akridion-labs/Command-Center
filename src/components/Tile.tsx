import React from 'react';

interface TileProps {
  children: React.ReactNode;
  className?: string;
}

export function Tile({ children, className = '' }: TileProps) {
  return (
    <div className={`tile ${className}`}>
      {children}
    </div>
  );
}