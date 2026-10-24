export function Aurora() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="aurora-blob aurora-blob-emerald" />
      <div className="aurora-blob aurora-blob-teal" />
      <div className="aurora-blob aurora-blob-cyan" />
    </div>
  );
}
