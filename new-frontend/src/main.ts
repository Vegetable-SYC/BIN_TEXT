import {
    populateFirmwareUI,  // Now populates firmwares (called populateDevicesUI previously)
    populateVersionsUI,
    setSelectionCallbacks,
    initConsoleTabs,
    setActiveTab,
    displayError
} from './ui';
import { initializeFlashingModule } from './flashing';
import { getAppConfig, getDeviceById, getFirmwareById, getVersionById, type Version } from './api';

let selectedDeviceId: string | null = null;
let selectedFirmwareId: string | null = null;
let selectedVersion: Version | null = null; // Store the full version object

// --- Callbacks for UI selections ---
const handleDeviceSelect = (deviceId: string) => {
    selectedDeviceId = deviceId;
    selectedFirmwareId = null; // Reset firmware selection
    selectedVersion = null; // Reset version selection
    
    const device = getDeviceById(deviceId);
    if (device) {
        populateFirmwareUI(device.firmwares); // Call new populateFirmwareUI
    } else {
        displayError('device-grid-container', new Error('Device not found.'));
    }
};

const handleFirmwareSelect = (firmwareId: string) => {
    if (!selectedDeviceId) return;

    selectedFirmwareId = firmwareId;
    selectedVersion = null; // Reset version selection

    const firmware = getFirmwareById(selectedDeviceId, firmwareId);
    if (firmware) {
        populateVersionsUI(firmware.versions);
    } else {
        displayError('version-selection', new Error('Firmware not found.'));
    }
};

const handleVersionSelect = (versionId: string) => {
    if (!selectedDeviceId || !selectedFirmwareId) return;

    const version = getVersionById(selectedDeviceId, selectedFirmwareId, versionId);
    if (version) {
        selectedVersion = version;
    } else {
        displayError('install-section', new Error('Version not found.'));
        selectedVersion = null;
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    initConsoleTabs();
    setSelectionCallbacks(handleDeviceSelect, handleFirmwareSelect, handleVersionSelect);
    
    initializeFlashingModule({ 
        setActiveTab, 
        getSelectedVersion: () => selectedVersion 
    });

    try {
        await getAppConfig(); // Load config
        const selectDeviceButtonMain = document.getElementById('select-device-button-main') as HTMLButtonElement;
        if (selectDeviceButtonMain) {
            selectDeviceButtonMain.disabled = false; // Enable the button
        }
        // The initial UI state is handled in ui.ts's event listener for selectDeviceButtonMain
        // No need to call populateProjectsUI(getAllDevices()) here directly anymore.
        // It will be called when the main 'Select Device' button is clicked.
    } catch (error: any) {
        displayError('project-selection', new Error(`Failed to load configuration: ${error.message}`));
        console.error("Failed to load app config:", error);
    }
});
