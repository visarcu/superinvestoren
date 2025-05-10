interface ErrorProps { message: string }

export default function ErrorFallback({ message }: ErrorProps) {
  return (
    <div className="p-4 bg-red-100 text-red-800 rounded text-sm">
      <strong>Fehler:</strong> {message}
    </div>
  )
}