"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <pre className="text-left bg-gray-100 p-4 rounded text-xs overflow-auto mb-4 max-h-64">
          {error.message}
          {"\n\n"}
          {error.stack}
        </pre>
        <button
          onClick={() => reset()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
