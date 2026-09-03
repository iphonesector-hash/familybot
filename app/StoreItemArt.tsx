import {STORE_ITEMS} from "@/lib/storeCatalog";
import {storeArtSrc} from "@/lib/storeArt";

export default function StoreItemArt({
  itemId,
  size = 86,
  className = "",
  label,
}: {
  itemId: string;
  size?: number;
  className?: string;
  label?: string;
}) {
  const item = STORE_ITEMS.find((x) => x.id === itemId);
  const rarity = item?.rarity || "common";
  return (
    <span
      className={`storeItemArt storeArt-${rarity} ${className}`}
      role="img"
      aria-label={label || item?.name || itemId}
      style={{width: size, height: size}}
    >
      <img src={storeArtSrc(itemId)} alt="" draggable={false} />
    </span>
  );
}
