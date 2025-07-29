"use client";

import { useState } from 'react';
import Image from 'next/image';
import { FileVideo } from 'lucide-react';

interface ThumbnailImageProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function ThumbnailImage({ 
  src, 
  alt, 
  width = 160, 
  height = 90, 
  className = "" 
}: ThumbnailImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Si no hay src o hubo error, mostrar placeholder
  if (!src || hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded ${className}`}
        style={{ width, height }}
      >
        <FileVideo className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded ${className}`} style={{ width, height }}>
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse"
        >
          <FileVideo className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="object-cover"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        unoptimized // Para data URIs
      />
    </div>
  );
}