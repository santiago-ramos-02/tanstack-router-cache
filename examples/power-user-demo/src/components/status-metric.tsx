export function StatusMetric({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="status-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
