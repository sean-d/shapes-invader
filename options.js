import settingsManager from "./settings-manager.js";

// Audio elements
const previewMusic1 = document.getElementById("preview-music-1");
const previewMusic2 = document.getElementById("preview-music-2");
const previewMusic3 = document.getElementById("preview-music-3");
const musicButtons = document.querySelectorAll(".music-button");
const musicVolume = document.getElementById("music-volume");
const sfxVolume = document.getElementById("sfx-volume");
const backButton = document.getElementById("back-button");
const musicValueDisplay = document.getElementById("music-value");
const sfxValueDisplay = document.getElementById("sfx-value");
const menuMusicToggle = document.getElementById("menu-music-toggle");

// Preview timeout
let previewTimeout = null;

// Default settings
const defaultSettings = {
  gameMusic: "classic1",
  musicVolume: 100,
  sfxVolume: 100,
  menuMusicEnabled: true,
};

// Load settings
async function loadSettings() {
  return await settingsManager.loadSettings();
}

// Save settings
async function saveSettings(settings) {
  await settingsManager.saveSettings(settings);
}

// Update value displays
function updateValueDisplays() {
  musicValueDisplay.textContent = musicVolume.value;
  sfxValueDisplay.textContent = sfxVolume.value;
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
  sfxVolume.value = settings.sfxVolume;
  updateValueDisplays();

  // Set menu music toggle
  menuMusicToggle.checked = settings.menuMusicEnabled;

  // Apply volume to preview music
  previewMusic1.volume = settings.musicVolume / 100;
  previewMusic2.volume = settings.musicVolume / 100;
  previewMusic3.volume = settings.musicVolume / 100;
}

// Handle music button clicks
musicButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    // Update selection
    musicButtons.forEach((b) => b.classList.remove("selected"));
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

    // Save settings
    const settings = await loadSettings();
    settings.gameMusic = button.dataset.track;
    await saveSettings(settings);
  });
});

// Handle volume changes
musicVolume.addEventListener("input", async () => {
  updateValueDisplays();
  const settings = await settingsManager.loadSettings();
  settings.musicVolume = parseInt(musicVolume.value);
  await settingsManager.saveSettings(settings);

  // Update preview volumes
  previewMusic1.volume = settings.musicVolume / 100;
  previewMusic2.volume = settings.musicVolume / 100;
  previewMusic3.volume = settings.musicVolume / 100;
});

sfxVolume.addEventListener("input", async () => {
  updateValueDisplays();
  const settings = await settingsManager.loadSettings();
  settings.sfxVolume = parseInt(sfxVolume.value);
  await settingsManager.saveSettings(settings);
});

// Handle back button
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

  // Go back to main menu
  window.location.href = "index.html";
});

// Handle menu music toggle
menuMusicToggle.addEventListener("change", async () => {
  const settings = await loadSettings();
  settings.menuMusicEnabled = menuMusicToggle.checked;
  await saveSettings(settings);
});

// Initialize settings
(async () => {
  const settings = await loadSettings();
  await applySettings(settings);
})();
