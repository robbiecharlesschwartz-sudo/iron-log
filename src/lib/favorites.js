/* Starred exercises.

   Stored as exercise NAMES, compared case-insensitively. Everything else in the app
   already keys an exercise by its name — library rows, custom exercises, history
   lookups — so a name is the only identifier an exercise reliably has, and a numeric id
   would have to be invented and then kept in sync with the library forever. */

export function favoriteSet(favorites) {
  return new Set((favorites || []).map((n) => String(n).trim().toLowerCase()));
}

export function isFavorite(favorites, name) {
  return favoriteSet(favorites).has(String(name || "").trim().toLowerCase());
}

// Returns a NEW list — callers persist the result, so mutating in place would make the
// saved copy and the rendered copy disagree.
export function toggleFavorite(favorites, name) {
  const list = favorites || [];
  const key = String(name || "").trim().toLowerCase();
  if (!key) return list;
  return list.some((n) => String(n).trim().toLowerCase() === key)
    ? list.filter((n) => String(n).trim().toLowerCase() !== key)
    : [...list, name];
}

// Favourites first, each group otherwise left in its original order.
export function favoritesFirst(list, favSet) {
  const fav = [], rest = [];
  for (const e of list) (favSet.has(String(e.name).trim().toLowerCase()) ? fav : rest).push(e);
  return [...fav, ...rest];
}
