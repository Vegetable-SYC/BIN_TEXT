import {
    populateProjectsUI,
    populateDevicesUI,
    populateVersionsUI,
    setSelectionCallbacks,
    initConsoleTabs,
    setActiveTab
} from './ui';
import { initializeFlashingModule, setManifestPathForFlashing } from './flashing';
import { getProjectConfig, getDeviceConfig } from './api';

// --- Callbacks for UI selections ---
const handleProjectSelect = async (projectId: string) => {
    try {
        const projData = await getProjectConfig(projectId);
        populateDevicesUI(projectId, projData.devices);
    } catch (error: any) {
        // TODO: Display error in UI
        console.error("Error fetching device config:", error);
    }
};

const handleDeviceSelect = async (projectId: string, deviceId: string) => {
    try {
        const devData = await getDeviceConfig(projectId, deviceId);
        populateVersionsUI(projectId, deviceId, devData.versions);
    } catch (error: any) {
        // TODO: Display error in UI
        console.error("Error fetching version config:", error);
    }
};

const handleVersionSelect = (manifestPath: string) => {
    setManifestPathForFlashing(manifestPath);
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // initializeThemes(); // This was from a previous implementation, removing it.
    setSelectionCallbacks(handleProjectSelect, handleDeviceSelect, handleVersionSelect);
    initConsoleTabs();
    populateProjectsUI();
    initializeFlashingModule({ setActiveTab });
});
