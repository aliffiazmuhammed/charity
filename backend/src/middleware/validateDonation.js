/**
 * Validation middleware for donation payloads.
 * Returns 400 with an array of error messages on failure.
 */
export const validateDonation = (req, res, next) => {
  const errors = [];
  const { donorName, phone, amount, date } = req.body;

  // Donor name — required non-empty string
  if (!donorName || typeof donorName !== 'string' || donorName.trim().length === 0) {
    errors.push('Donor name is required');
  }

  // Phone — required, at least 10 digit characters
  if (!phone || typeof phone !== 'string') {
    errors.push('Phone number is required');
  } else {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      errors.push('Phone number must contain at least 10 digits');
    }
  }

  // Amount — required positive number
  if (amount === undefined || amount === null) {
    errors.push('Donation amount is required');
  } else if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    errors.push('Donation amount must be a positive number');
  }

  // Date — if provided, must be a valid date; otherwise defaults in model
  if (date !== undefined && date !== null && date !== '') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      errors.push('Invalid date format');
    }
  }

  // Note — optional, no validation needed

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};
