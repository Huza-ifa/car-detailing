/** Join conditional class names without pulling in a dependency. */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

/** Format a config price for display, e.g. 1450 -> "$1,450". */
export function formatPrice(
  value: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Apply a vehicle-size multiplier and round to the nearest $5. */
export function priceForVehicle(base: number, multiplier: number): number {
  return Math.round((base * multiplier) / 5) * 5;
}
