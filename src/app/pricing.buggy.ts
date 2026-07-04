export function calculateTotal(quantity: number, unitPrice: number): number {
  let discount = 0;
  if (quantity > 50) discount = 0.2;
  else if (quantity > 10) discount = 0.1;

  const raw = quantity * unitPrice * (1 - discount);
  return Math.round(raw * 100) / 100;
}
