window.storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    if (value === null) throw new Error("key not found: " + key);
    return { key, value, shared: false };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
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
