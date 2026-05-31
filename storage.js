/**
 * aarkme Storage Utility
 * Handles localStorage with robust error handling and validation.
 */

export class Storage {
  constructor(key, defaultValue = {}) {
    this.key = key;
    this.defaultValue = defaultValue;
  }

  /**
   * Loads data from localStorage with validation.
   */
  load() {
    try {
      const saved = localStorage.getItem(this.key);
      if (!saved) return this.defaultValue;

      const parsed = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn(`Storage [${this.key}]: Invalid data format. Resetting to default.`);
        return this.defaultValue;
      }

      return parsed;
    } catch (error) {
      console.error(`Storage [${this.key}]: Could not load.`, error);
      return this.defaultValue;
    }
  }

  /**
   * Persists data to localStorage.
   */
  save(data) {
    try {
      const payload = JSON.stringify(data);
      localStorage.setItem(this.key, payload);
      return true;
    } catch (error) {
      console.error(`Storage [${this.key}]: Could not save.`, error);

      if (error.name === 'QuotaExceededError') {
        window.alert('Storage quota exceeded. Try removing some images or clearing slots.');
      }

      return false;
    }
  }

  /**
   * Removes the data from localStorage.
   */
  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.error(`Storage [${this.key}]: Could not clear.`, error);
    }
  }
}
