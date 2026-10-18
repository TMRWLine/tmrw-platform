/**
 * Shared, dependency-free validation helpers. Everything here runs offline in the browser.
 */

/** ATO weighting factors, applied left to right across the 11 ABN digits. */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

export const ABN_ERROR_MESSAGE = 'Invalid Australian Business Number format';

/** Remove every non-digit character ("51 824 753 556" -> "51824753556"). */
export const stripNonDigits = (value: string): string => value.replace(/\D/g, '');

/**
 * Official ATO Modulus 89 ABN check:
 *  1. strip non-digits and require exactly 11 digits,
 *  2. subtract 1 from the first digit,
 *  3. multiply each digit by its weighting factor,
 *  4. the weighted sum must be divisible by 89.
 */
export function isValidAbn(input: string): boolean {
  const digits = stripNonDigits(input);
  if (digits.length !== ABN_WEIGHTS.length) return false;

  const sum = digits.split('').reduce((acc, char, index) => {
    const digit = Number(char) - (index === 0 ? 1 : 0);
    return acc + digit * ABN_WEIGHTS[index];
  }, 0);

  return sum % 89 === 0;
}
