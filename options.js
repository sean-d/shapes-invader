import settingsManager from "./settings-manager.js";

// Audio elements
const previewMusic1 = document.getElementById("preview-music-1");
const previewMusic2 = document.getElementById("preview-music-2");
const musicButtons = document.querySelectorAll(".music-button");
const musicVolume = document.getElementById("music-volume");
const sfxVolume = document.getElementById("sfx-volume");
const backButton = document.getElementById("back-button");

// Preview timeout
let previewTimeout = null;

// Default settings
const defaultSettings = {
  gameMusic: "classic1",
  musicVolume: 100,
  sfxVolume: 100,
};

// Load settings
async function loadSettings() {
  return await settingsManager.loadSettings();
}

// Save settings
async function saveSettings(settings) {
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
  sfxVolume.value = settings.sfxVolume;

  // Apply volume to preview music
  previewMusic1.volume = settings.musicVolume / 100;
  previewMusic2.volume = settings.musicVolume / 100;
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
      previewMusic1.currentTime = 0;
      previewMusic2.currentTime = 0;
    }

    // Play preview of selected track
    const track =
      button.dataset.track === "classic1" ? previewMusic1 : previewMusic2;
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
  const volume = musicVolume.value / 100;

  // Apply volume to preview music
  previewMusic1.volume = volume;
  previewMusic2.volume = volume;

  // Save settings
  const settings = await loadSettings();
  settings.musicVolume = parseInt(musicVolume.value);
  await saveSettings(settings);
});

sfxVolume.addEventListener("input", async () => {
  const settings = await loadSettings();
  settings.sfxVolume = parseInt(sfxVolume.value);
  await saveSettings(settings);
});

// Handle back button
backButton.addEventListener("click", () => {
  // Stop any playing preview
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewMusic1.pause();
    previewMusic2.pause();
    previewMusic1.currentTime = 0;
    previewMusic2.currentTime = 0;
  }

  // Go back to main menu
  window.location.href = "index.html";
});

// Initialize settings
(async () => {
  const settings = await loadSettings();
  await applySettings(settings);
})();
