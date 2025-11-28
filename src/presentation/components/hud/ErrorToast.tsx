'use client';

interface ErrorToastProps {
  message: string;
}

export function ErrorToast({ message }: ErrorToastProps) {
  return (
    <div className="absolute top-4 right-32 bg-red-950/90 backdrop-blur-sm text-red-200 px-5 py-3 rounded-xl z-30 border border-red-500/30 shadow-lg">
      {message}
    </div>
  );
}
