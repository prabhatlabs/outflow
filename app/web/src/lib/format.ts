export function memberName(first: string, last: string | null, email: string) {
  return [first, last].filter(Boolean).join(" ") || email;
}
