const CUSTOMER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidCustomerEmail(value: string | null | undefined) {
  const email = value?.trim() ?? '';
  return CUSTOMER_EMAIL_PATTERN.test(email);
}
