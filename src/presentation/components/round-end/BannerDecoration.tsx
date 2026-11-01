import { SeasonalDivider } from '../seasonal';

// Banner decoration - extracted to avoid creating during render
export function BannerDecoration() {
  return (
    <div className="flex justify-center mb-2">
      <SeasonalDivider size={16} className="w-32" />
    </div>
  );
}
