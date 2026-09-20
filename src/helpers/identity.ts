/**
 * Turn a stored user id into something worth showing on a shared screen.
 *
 * Ids are either a legacy handle ("anhtpq") or the user's email address, so on
 * the leaderboard — the one place a user sees *other* people's rows — the raw
 * id would publish everyone's address. Dropping the domain keeps the local
 * part, which reads as a username and leaks nothing routable.
 */
export function displayNameFromUserId(userId: string): string {
  const atIndex = userId.indexOf("@");
  const local = atIndex > 0 ? userId.slice(0, atIndex) : userId;
  return local.trim() || userId;
}
