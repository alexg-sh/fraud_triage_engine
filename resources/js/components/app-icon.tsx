import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/core-free-icons';

type AppIconProps = Omit<HugeiconsIconProps, 'icon'> & {
  icon: IconSvgElement;
};

export function AppIcon({ icon, className, ...props }: AppIconProps) {
  return <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} className={className} {...props} />;
}
