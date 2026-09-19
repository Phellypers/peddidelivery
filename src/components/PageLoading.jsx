export default function PageLoading() {
  return <div role="status" aria-label="Carregando página" className="flex min-h-[40dvh] items-center justify-center bg-white">
    <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
  </div>;
}
