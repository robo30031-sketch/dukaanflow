/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a numeric value into standard Indian Currency format (INR - ₹)
 * Examples:
 * 1234 -> ₹1,234.00
 * 123456 -> ₹1,23,456.00
 * 1000000 -> ₹10,00,000.00
 */
export function formatINR(amount: number | null | undefined, showDecimals: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showDecimals ? '₹0.00' : '₹0';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const parts = absAmount.toFixed(showDecimals ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian numbering grouping: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = showDecimals && decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  return `${isNegative ? '-' : ''}₹${result}`;
}

/**
 * Formats a date into a clean, readable Indian retail standard format
 * e.g., 26 Oct 2026 or 26 Oct 2026, 04:15 PM
 */
export function formatDate(dateInput: string | Date | null | undefined, includeTime: boolean = false): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
    };
    return new Intl.DateTimeFormat('en-IN', options).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Returns a readable relative date or standard date
 */
export function formatShortDate(dateInput: string | Date): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const today = new Date();
  
  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) {
    return 'Today, ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return formatDate(d, true);
}

/**
 * Generates an Indian retail invoice number like INV-20261026-0001
 */
export function generateInvoiceNumber(sequence: number): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const seqStr = String(sequence).padStart(4, '0');
  return `INV-${year}${month}${day}-${seqStr}`;
}
