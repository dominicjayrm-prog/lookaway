'use client';

import type { LibraryItem } from '@/data/objectLibrary';

interface Props {
  item: LibraryItem;
  size?: number;
  color?: string;
}

export default function LibraryThumbnail({ item, size = 36, color = '#78909C' }: Props) {
  return item.render(color, size);
}
