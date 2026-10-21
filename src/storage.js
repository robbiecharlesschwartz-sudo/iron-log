window.storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    if (value === null) throw new Error("key not found: " + key);
    return { key, value, shared: false };
  },
  async set(key, value) {
    // Every call site swallows this promise's rejection, so a failed write — full
    // storage, or Safari private browsing — used to lose a finished workout in
    // silence. Announce it once here instead of at 41 call sites; App turns it into
    // the sync error the header already shows.
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      window.dispatchEvent(new CustomEvent("iron-log-storage-failed", { detail: String(err && err.message || err) }));
      throw err;
    }
    return { key, value, shared: false };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true, shared: false };
  },
  async list(prefix) {
    return {
      keys: Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix)),
      prefix,
      shared: false,
    };
  },
};
