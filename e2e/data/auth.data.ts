/** Synthetic values for form validation; account credentials remain in the local environment. */
export const authData = {
  invalidEmail: 'not-an-email',
  syntheticEmail: 'test@example.invalid',
  shortPassword: '12345',
  validFormatPassword: '123456',
  differentPassword: '654321',
} as const;
