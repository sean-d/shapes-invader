const { app, BrowserWindow, ipcMain, contextBridge } = require("electron");
const path = require("path");
const fs = require("fs").promises;

// Get the user's app data directory
function getSettingsPath() {
  const appDataPath =
    process.platform === "darwin"
      ? path.join(
          process.env.HOME,
          "Library",
          "Application Support",
          "shapes-invader"
        )
      : process.platform === "win32"
      ? path.join(process.env.APPDATA, "shapes-invader")
      : path.join(process.env.HOME, ".config", "shapes-invader");

  return path.join(appDataPath, "settings.json");
}

// Ensure settings directory exists
async function ensureSettingsDirectory() {
  const settingsPath = getSettingsPath();
  const settingsDir = path.dirname(settingsPath);

  try {
    await fs.mkdir(settingsDir, { recursive: true });
  } catch (error) {
    console.error("Error creating settings directory:", error);
  }
}

// Load settings from file
async function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    const data = await fs.readFile(settingsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default settings
    return {
      gameMusic: "classic1",
      musicVolume: 100,
      sfxVolume: 100,
    };
  }
}

// Save settings to file
async function saveSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    await ensureSettingsDirectory();
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

// Create the browser window
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
}

// When Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle window-all-closed event
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handlers for settings
ipcMain.handle("load-settings", loadSettings);
ipcMain.handle("save-settings", (event, settings) => saveSettings(settings));
