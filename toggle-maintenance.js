const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, 'site-settings.json');

// Read current settings
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Error reading settings:', err);
    return {};
  }
}

// Write settings
function writeSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log('✅ Settings updated successfully!');
    console.log('🔄 Restart the server for changes to take effect.');
  } catch (err) {
    console.error('Error writing settings:', err);
  }
}

// Toggle maintenance mode
function toggleMaintenanceMode() {
  const settings = readSettings();
  const currentMode = settings.maintenance_mode;
  settings.maintenance_mode = !currentMode;

  writeSettings(settings);
  console.log(`🔧 Maintenance mode: ${currentMode ? 'ON → OFF' : 'OFF → ON'}`);
}

// Check current status
function checkStatus() {
  const settings = readSettings();
  console.log(`📊 Current maintenance mode: ${settings.maintenance_mode ? 'ON' : 'OFF'}`);
}

// Main logic
const action = process.argv[2];

if (action === 'toggle') {
  toggleMaintenanceMode();
} else if (action === 'status') {
  checkStatus();
} else if (action === 'on') {
  const settings = readSettings();
  settings.maintenance_mode = true;
  writeSettings(settings);
  console.log('🔧 Maintenance mode: TURNED ON');
} else if (action === 'off') {
  const settings = readSettings();
  settings.maintenance_mode = false;
  writeSettings(settings);
  console.log('🔧 Maintenance mode: TURNED OFF');
} else {
  console.log('Usage:');
  console.log('  node toggle-maintenance.js status  - Check current status');
  console.log('  node toggle-maintenance.js toggle  - Toggle on/off');
  console.log('  node toggle-maintenance.js on      - Turn ON');
  console.log('  node toggle-maintenance.js off     - Turn OFF');
}
