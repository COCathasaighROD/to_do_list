export const Storage = {
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving to localStorage", e);
    }
  },

  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error("Error reading from localStorage", e);
      return null;
    }
  },

  // Helper to get data for a specific date
  getDayData(dateKey) {
    return this.get(`planner_${dateKey}`) || {
      goals: [],
      timeBlocks: {}
    };
  },

  saveDayData(dateKey, data) {
    this.save(`planner_${dateKey}`, data);
  }
};
