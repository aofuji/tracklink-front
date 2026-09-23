export function isInternalReturnUrl(value: string | null | undefined): value is string {
  if (!value || !value.startsWith('/')) {
    return false;
  }

  if (value.startsWith('//') || value.includes('://') || value.includes('\\')) {
    return false;
  }

  return true;
}
