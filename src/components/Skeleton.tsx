'use client';
export default function Skeleton({ width = '100%', height = '1rem' }: { width?: string; height?: string }) {
  return (
    <div
      className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded"
      style={{ width, height }}
    />
  );
}