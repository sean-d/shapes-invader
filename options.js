import settingsManager from "./settings-manager.js";

// Audio elements
const previewMusic1 = document.getElementById("preview-music-1");
const previewMusic2 = document.getElementById("preview-music-2");
const previewMusic3 = document.getElementById("preview-music-3");
const musicButtons = document.querySelectorAll(".music-button");
const musicVolume = document.getElementById("music-volume");
const backButton = document.getElementById("back-button");
const musicValueDisplay = document.getElementById("music-value");
const menuMusicToggle = document.getElementById("menu-music-toggle");

// Preview timeout
let previewTimeout = null;

// Default settings
const defaultSettings = {
  gameMusic: "classic1",
  musicVolume: 100,
  menuMusicEnabled: true,
};

// Load settings
async function loadSettings() {
  return await settingsManager.loadSettings();
}

// Save settings
async function saveSettings() {
  const settings = {
    gameMusic:
      Array.from(musicButtons).find((btn) => btn.classList.contains("selected"))
        ?.dataset.track || "classic1",
    musicVolume: parseInt(musicVolume.value),
    menuMusicEnabled: menuMusicToggle.checked,
  };
  await settingsManager.saveSettings(settings);
}

// Apply settings to UI
async function applySettings(settings) {
  // Set music selection
  musicButtons.forEach((button) => {
    button.classList.remove("selected");
    if (button.dataset.track === settings.gameMusic) {
      button.classList.add("selected");
    }
  });

  // Set volume values
  musicVolume.value = settings.musicVolume;
  updateValueDisplays();

  // Set menu music toggle
  menuMusicToggle.checked = settings.menuMusicEnabled;

  // Apply volume to preview music
  previewMusic1.volume = settings.musicVolume / 100;
  previewMusic2.volume = settings.musicVolume / 100;
  previewMusic3.volume = settings.musicVolume / 100;
}

// Update value displays
function updateValueDisplays() {
  musicValueDisplay.textContent = musicVolume.value;
}

// Initialize
async function init() {
  try {
    const settings = await loadSettings();
    await applySettings(settings);

    // Add event listeners
    musicButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        // Update selection
        musicButtons.forEach((btn) => btn.classList.remove("selected"));
        button.classList.add("selected");

        // Stop any playing preview
        if (previewTimeout) {
          clearTimeout(previewTimeout);
          previewMusic1.pause();
          previewMusic2.pause();
          previewMusic3.pause();
          previewMusic1.currentTime = 0;
          previewMusic2.currentTime = 0;
          previewMusic3.currentTime = 0;
        }

        // Play preview of selected track
        let track;
        switch (button.dataset.track) {
          case "classic1":
            track = previewMusic1;
            break;
          case "classic2":
            track = previewMusic2;
            break;
          case "heights":
            track = previewMusic3;
            break;
          default:
            track = previewMusic1;
        }
        track.play();

        // Stop preview after 10 seconds
        previewTimeout = setTimeout(() => {
          track.pause();
          track.currentTime = 0;
        }, 10000);

        await saveSettings();
      });
    });

    musicVolume.addEventListener("input", async () => {
      updateValueDisplays();
      // Update preview volumes
      const volume = musicVolume.value / 100;
      previewMusic1.volume = volume;
      previewMusic2.volume = volume;
      previewMusic3.volume = volume;
      await saveSettings();
    });

    menuMusicToggle.addEventListener("change", async () => {
      await saveSettings();
    });

    backButton.addEventListener("click", () => {
      // Stop any playing preview
      if (previewTimeout) {
        clearTimeout(previewTimeout);
        previewMusic1.pause();
        previewMusic2.pause();
        previewMusic3.pause();
        previewMusic1.currentTime = 0;
        previewMusic2.currentTime = 0;
        previewMusic3.currentTime = 0;
      }
      window.location.href = "index.html";
    });
  } catch (error) {
    console.error("Error initializing options:", error);
  }
}

// Start initialization
init();
