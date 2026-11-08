import { isDate, validReference } from "./investmentRates.mjs";
// Future adapters implement fetch(indicator, { signal }). No provider is enabled.
// Invalid, stale, failed or unavailable responses never become a fabricated quote.
export async function loadIndicator(
  indicator,
  { provider, today, maxAgeDays = 45, signal } = {},
) {
  if (
    !["cdi", "ipca"].includes(indicator) ||
    !isDate(today) ||
    !Number.isFinite(maxAgeDays) ||
    maxAgeDays < 0
  )
    throw Error("Pedido de indicador inválido.");
  if (!provider) return { status: "unavailable", reference: null };
  try {
    const reference = await provider.fetch(indicator, { signal });
    if (
      !validReference(reference) ||
      reference.indicator !== indicator ||
      reference.asOf > today
    )
      return { status: "invalid", reference: null };
    const age = (Date.parse(today) - Date.parse(reference.asOf)) / 86400000;
    if (age > maxAgeDays) return { status: "stale", reference };
    return { status: "ready", reference };
  } catch {
    return { status: "error", reference: null };
  }
}
