import type { Shipment } from '../types/models';

export function formatPackageSize(
  orderOrSize?: Partial<Shipment> | string | null
): 'Small' | 'Medium' | 'Big' {
  if (!orderOrSize) return 'Medium';

  let raw = '';
  let instructions = '';
  let weight: number | null = null;

  if (typeof orderOrSize === 'string') {
    raw = orderOrSize;
  } else {
    raw = (orderOrSize.packageSize as any) || (orderOrSize as any).package_size || '';
    instructions = orderOrSize.additionalInstructions || '';
    if (orderOrSize.weightKg != null) {
      weight = Number(orderOrSize.weightKg);
    }
  }

  const cleanRaw = String(raw).toLowerCase().trim();
  if (cleanRaw === 'small' || cleanRaw.includes('small')) return 'Small';
  if (cleanRaw === 'big' || cleanRaw.includes('big') || cleanRaw === 'large' || cleanRaw.includes('large')) return 'Big';
  if (cleanRaw === 'medium' || cleanRaw.includes('medium')) return 'Medium';

  // Check additionalInstructions if any (e.g. "[Size: Small]" or "size: big")
  const inst = instructions.toLowerCase();
  if (inst.includes('size: small') || inst.includes('size:small') || inst.includes('size - small')) return 'Small';
  if (inst.includes('size: big') || inst.includes('size:big') || inst.includes('size: large') || inst.includes('size - big')) return 'Big';
  if (inst.includes('size: medium') || inst.includes('size:medium') || inst.includes('size - medium')) return 'Medium';

  if (weight !== null && !isNaN(weight) && weight > 0) {
    if (weight <= 3) return 'Small';
    if (weight > 10) return 'Big';
    return 'Medium';
  }

  return 'Medium';
}

export function getPackageSizeBadgeColors(size: 'Small' | 'Medium' | 'Big') {
  switch (size) {
    case 'Small':
      return {
        bg: '#f0fdf4',
        text: '#166534',
        border: '#bbf7d0',
      };
    case 'Big':
      return {
        bg: '#fef3c7',
        text: '#92400e',
        border: '#fde68a',
      };
    case 'Medium':
    default:
      return {
        bg: '#eff6ff',
        text: '#1e40af',
        border: '#bfdbfe',
      };
  }
}
