// Default settings
const defaultSettings = {
  gameMusic: "classic1",
  musicVolume: 40,
  highestLevel: 1,
  menuMusicEnabled: true,
};

class SettingsManager {
  constructor() {
    this.isDesktop = typeof window.electron !== "undefined";
  }

  async loadSettings() {
    if (this.isDesktop) {
      try {
        const settings = await window.electron.loadSettings();
        return settings || defaultSettings;
      } catch (error) {
        console.error("Error loading settings from file:", error);
        return defaultSettings;
      }
    } else {
      // Web version - use localStorage
      const savedSettings = localStorage.getItem("tetrisSettings");
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
      return defaultSettings;
    }
  }

  async saveSettings(settings) {
    if (this.isDesktop) {
      try {
        await window.electron.saveSettings(settings);
      } catch (error) {
        console.error("Error saving settings to file:", error);
      }
    } else {
      // Web version - use localStorage
      localStorage.setItem("tetrisSettings", JSON.stringify(settings));
    }
  }
}

// Create and export a singleton instance
const settingsManager = new SettingsManager();
export default settingsManager;
