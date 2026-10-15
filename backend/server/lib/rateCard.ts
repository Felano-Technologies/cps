/**
 * Business rate cards: custom pricing for one business (e.g. Shopyos) on top
 * of the standard route price — parcel sizes, a surcharge for outer areas,
 * and express. Businesses without a rate card (and CPS's own customers) pay
 * the standard price; nothing here changes their deliveries.
 *
 * Price = route price
 *         × size      (Kumasi price for that size ÷ 35, rounded to cents, then UP to `roundTo`)
 *         + outskirts (flat fee if a pickup or the drop-off is in an outer area)
 *         × express   (expressMultiplier, when the delivery is express)
 *         + extra pickups (flat fee for each additional shop collected on the
 *           same trip — every one must be within `extraPickupRadiusKm` of the
 *           first pickup; not multiplied by express)
 */
import type { BusinessRateCard, PackageSize } from '@prisma/client';
import { prisma } from './prisma';
import { SAME_CITY_RATE } from './pricing';

export const SIZE_CATEGORIES = ['standard', 'medium', 'big', 'big_plus'] as const;
export type SizeCategory = (typeof SIZE_CATEGORIES)[number];

export const SIZE_LABELS: Record<SizeCategory, string> = {
  standard: 'Standard (1–5 kg)',
  medium: 'Medium (6–10 kg)',
  big: 'Big (10–12 kg)',
  big_plus: 'Big+ (13–15 kg)',
};

/** A circle on the map whose deliveries cost the outskirts fee. */
export interface OutskirtsArea {
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface Point {
  latitude: number;
  longitude: number;
}

/** The numbers a price is worked out from — saved on each shipment so later edits never change it. */
export interface RateCardTerms {
  sizeKumasiPrices: Record<SizeCategory, number>;
  roundTo: number;
  outskirtsFee: number;
  outskirtsAreas: OutskirtsArea[];
  expressMultiplier: number;
  /** Added for each extra shop collected on the same trip (multi-pickup). */
  extraPickupFee: number;
  /** Extra pickups must be at most this far from the first pickup. */
  extraPickupRadiusKm: number;
}

export function termsOf(card: BusinessRateCard): RateCardTerms {
  return {
    sizeKumasiPrices: {
      standard: SAME_CITY_RATE,
      medium: Number(card.mediumKumasiPrice),
      big: Number(card.bigKumasiPrice),
      big_plus: Number(card.bigPlusKumasiPrice),
    },
    roundTo: Number(card.roundTo),
    outskirtsFee: Number(card.outskirtsFee),
    outskirtsAreas: Array.isArray(card.outskirtsAreas) ? (card.outskirtsAreas as unknown as OutskirtsArea[]) : [],
    expressMultiplier: Number(card.expressMultiplier),
    extraPickupFee: Number(card.extraPickupFee ?? 15),
    extraPickupRadiusKm: Number(card.extraPickupRadiusKm ?? 3),
  };
}

/** The business's rate card, or null when it pays standard prices. */
export async function rateCardFor(businessId: string): Promise<RateCardTerms | null> {
  const card = await prisma.businessRateCard.findUnique({ where: { businessId } });
  return card?.enabled ? termsOf(card) : null;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** Route price for a parcel size. Standard is the route price itself. */
export function sizedFee(terms: RateCardTerms, routeFee: number, size: SizeCategory): number {
  if (size === 'standard') return routeFee;
  // Rounding to cents first absorbs float noise (35 × 100/35 = 100.00000000000001).
  const raw = cents(routeFee * terms.sizeKumasiPrices[size] / SAME_CITY_RATE);
  const step = terms.roundTo > 0 ? terms.roundTo : 0.01;
  return cents(Math.ceil(cents(raw / step)) * step);
}

export function distanceKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** The outer area a point falls in, if any. */
export function outskirtsAreaAt(terms: RateCardTerms, point?: Point | null): OutskirtsArea | null {
  if (!point) return null;
  return terms.outskirtsAreas.find(a => distanceKm(point, a) <= a.radiusKm) ?? null;
}

export interface RateCardPrice {
  fee: number;
  routeFee: number;
  sizeCategory: SizeCategory;
  sizeFee: number;
  outskirtsFee: number;
  outskirtsArea: string | null;
  express: boolean;
  /** Number of extra shops collected on this trip (0 for a single pickup). */
  extraPickups: number;
  /** Total added for them: extraPickups × terms.extraPickupFee. */
  extraPickupsFee: number;
}

/**
 * Extra pickups that are too far from the first pickup to share the trip
 * (or have no map pin to check). Empty means they can all be collected together.
 */
export function pickupsTooFar(terms: RateCardTerms, first: Point | null | undefined, extras: (Point | null | undefined)[]): number[] {
  return extras
    .map((p, i) => (!first || !p || distanceKm(first, p) > terms.extraPickupRadiusKm ? i : -1))
    .filter(i => i >= 0);
}

export function priceWithRateCard(terms: RateCardTerms, input: {
  routeFee: number;
  sizeCategory?: SizeCategory;
  express?: boolean;
  pickup?: Point | null;
  dropoff?: Point | null;
  /** Additional nearby shops collected on the same trip (validate with pickupsTooFar first). */
  extraPickups?: (Point | null)[];
}): RateCardPrice {
  const sizeCategory = input.sizeCategory ?? 'standard';
  const sizeFee = sizedFee(terms, input.routeFee, sizeCategory);
  const extras = input.extraPickups ?? [];
  // Charged once, whether a pickup, the drop-off or several of them are in an outer area.
  const area = outskirtsAreaAt(terms, input.dropoff)
    ?? outskirtsAreaAt(terms, input.pickup)
    ?? extras.map(p => outskirtsAreaAt(terms, p)).find(Boolean)
    ?? null;
  const outskirtsFee = area ? terms.outskirtsFee : 0;
  const express = !!input.express;
  const extraPickupsFee = cents(extras.length * terms.extraPickupFee);
  const fee = cents((sizeFee + outskirtsFee) * (express ? terms.expressMultiplier : 1) + extraPickupsFee);
  return {
    fee, routeFee: input.routeFee, sizeCategory, sizeFee, outskirtsFee, outskirtsArea: area?.name ?? null, express,
    extraPickups: extras.length, extraPickupsFee,
  };
}

/**
 * New fee for a booked rate-card delivery whose parcel turned out to be a
 * different size, from the terms saved on it. Outskirts, express and extra
 * pickups stay as booked.
 */
export function repriceForSize(terms: RateCardTerms, booked: {
  routeFee: number; outskirtsFee: number; express: boolean; extraPickupsFee?: number;
}, size: SizeCategory): number {
  const sizeFee = sizedFee(terms, booked.routeFee, size);
  return cents((sizeFee + booked.outskirtsFee) * (booked.express ? terms.expressMultiplier : 1) + (booked.extraPickupsFee ?? 0));
}

/** CPS's own package size for a rate-card size (what riders and ops see). */
export function packageSizeFor(size: SizeCategory): PackageSize {
  if (size === 'standard') return 'small';
  if (size === 'medium') return 'medium';
  return 'big';
}

/** What a business sees of its own rate card in the price list. */
export function rateCardView(terms: RateCardTerms) {
  return {
    sizes: SIZE_CATEGORIES.map(size => ({ size, label: SIZE_LABELS[size], kumasiPrice: terms.sizeKumasiPrices[size] })),
    roundTo: terms.roundTo,
    outskirtsFee: terms.outskirtsFee,
    outskirtsAreas: terms.outskirtsAreas,
    expressMultiplier: terms.expressMultiplier,
    extraPickupFee: terms.extraPickupFee,
    extraPickupRadiusKm: terms.extraPickupRadiusKm,
    formula: 'route fee × size (rounded up to roundTo) + outskirtsFee if a pickup or the drop-off is in an outskirts area, then × expressMultiplier for express, + extraPickupFee for each extra shop within extraPickupRadiusKm of the first pickup',
  };
}
