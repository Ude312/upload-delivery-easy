// lib/validator.ts
// Validates that a generated filename conforms to the expected format.
// Format (to be finalised): <SUPPLIER>_<CATEGORY>_<ORDER>_<DATE>.pdf
// e.g. ACME_ELECTRONICS_ORD-2024-001_2024-03-15.pdf

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Format: <DOCTYPE>_<SUPPLIER>_<CATEGORY>_<ORDER>_<DATE>.pdf
// e.g.    LS_ifm_Sensor_45001199207_2024-03-15.pdf
// DOCTYPE: 2-3 uppercase letters (e.g. LS, RE, AB, PLT)
// ORDER:   45XXXXXXX (8-11 digits starting with 45) or UNKNOWN
const FILENAME_REGEX =
  /^[A-Z]{2,3}_[A-Z0-9\-]+_[A-Z0-9\-]+_(45\d{6,9}|UNKNOWN)_\d{4}-\d{2}-\d{2}\.pdf$/;

/**
 * Validates a generated filename against the expected format.
 * @param filename - The filename string to validate
 * @returns ValidationResult with a valid flag and any error messages
 */
export function validateFilename(filename: string): ValidationResult {
  const errors: string[] = [];

  if (!FILENAME_REGEX.test(filename)) {
    errors.push(
      `Filename "${filename}" does not match expected format: SUPPLIER_CATEGORY_ORDER_YYYY-MM-DD.pdf`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
