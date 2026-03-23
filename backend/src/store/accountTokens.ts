const accountTokenByEndUserOriginId = new Map<string, string>();

export function setAccountToken(endUserOriginId: string, accountToken: string) {
  accountTokenByEndUserOriginId.set(endUserOriginId, accountToken);
}

export function getAccountToken(endUserOriginId: string): string | undefined {
  return accountTokenByEndUserOriginId.get(endUserOriginId);
}
