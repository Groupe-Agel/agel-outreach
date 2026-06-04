export function SkeletonRow({
  width = "60%",
  height = 14,
}: {
  width?: string | number;
  height?: number;
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 4 }}
    />
  );
}
