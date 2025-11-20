// flashing.ts
import {
    initESPLoader,
    disconnectESPLoader,
    startFlashing,
    term,
    serialMonitorTerminal,
    fitAddon,
    monitorFitAddon,
} from './esptool-wrapper';
// @ts-ignore
import { setActiveTab } from './ui';
import type { Version } from './api';

const customInstallButton = document.getElementById('custom-install-button') as HTMLButtonElement;
const terminalLogElement = document.getElementById('terminal-log');
const serialMonitorLogElement = document.getElementById('serial-monitor-log');

// Define states for the button
const FlashingState = {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    FLASHING: 'FLASHING',
    DISCONNECTING: 'DISCONNECTING'
};

let currentState = FlashingState.DISCONNECTED;
let getSelectedVersionCallback: () => Version | null;
let areTerminalsInitialized = false;
let setActiveTabCallback: (tabName: string) => void;

function updateButtonState(newState: string) {
    currentState = newState;
    if (!customInstallButton) return;

    switch (newState) {
        case FlashingState.DISCONNECTED:
            customInstallButton.textContent = "连接设备";
            customInstallButton.disabled = false;
            break;
        case FlashingState.CONNECTING:
            customInstallButton.textContent = "Connecting...";
            customInstallButton.disabled = true;
            break;
        case FlashingState.CONNECTED:
            customInstallButton.textContent = "烧录";
            customInstallButton.disabled = false;
            break;
        case FlashingState.FLASHING:
            customInstallButton.textContent = "Flashing...";
            customInstallButton.disabled = true;
            break;
        case FlashingState.DISCONNECTING:
            customInstallButton.textContent = "Disconnecting...";
            customInstallButton.disabled = true;
            break;
    }
}

// This function is no longer needed as we get the selected version directly
// export function setManifestPathForFlashing(manifestPath: string | null) { }

async function connectDevice() {
    if (currentState !== FlashingState.DISCONNECTED) return;

    if (!getSelectedVersionCallback || !getSelectedVersionCallback()) {
        alert('Please select a firmware version first.');
        return;
    }
    
    if(setActiveTabCallback) setActiveTabCallback('terminal');
    updateButtonState(FlashingState.CONNECTING);

    try {
        if (!areTerminalsInitialized && terminalLogElement && serialMonitorLogElement) {
            term.open(terminalLogElement);
            fitAddon.fit();
            serialMonitorTerminal.open(serialMonitorLogElement);
            monitorFitAddon.fit();
            areTerminalsInitialized = true;
        }
        const baudRateSelect = document.getElementById('baud-rate-select') as HTMLSelectElement;
        const selectedBaudRate = parseInt(baudRateSelect.value);
        term.clear();
        await initESPLoader(selectedBaudRate);
        console.log("Device connected successfully.");
        updateButtonState(FlashingState.CONNECTED);
    } catch (error: any) {
        console.error("Connection Error:", error);
        term.writeln(`Connection failed: ${error.message}`);
        updateButtonState(FlashingState.DISCONNECTED);
    }
}

async function flashDevice() {
    if (currentState !== FlashingState.CONNECTED) return;

    const selectedVersion = getSelectedVersionCallback ? getSelectedVersionCallback() : null;
    if (!selectedVersion) {
        alert('Firmware version is not selected. Cannot start flashing.');
        return;
    }

    if(setActiveTabCallback) setActiveTabCallback('terminal');
    updateButtonState(FlashingState.FLASHING);
    
    try {
        // Pass the full selectedVersion object
        await startFlashing(selectedVersion, false); // Assuming eraseFlash is false
        term.writeln("Flashing complete!");
    } catch (error: any) {
        console.error("Flashing Error:", error);
        term.writeln(`Flashing failed: ${error.message}`);
    } finally {
        // Disconnect after flashing attempt
        updateButtonState(FlashingState.DISCONNECTING);
        try {
            await disconnectESPLoader();
            term.writeln("Device disconnected.");
        } catch (disconnectError) {
            console.error("Disconnection failed:", disconnectError);
            term.writeln("Failed to disconnect. Please manually unplug and replug the device.");
        }
        updateButtonState(FlashingState.DISCONNECTED);
    }
}


export async function handleInstallButtonClick() {
    switch (currentState) {
        case FlashingState.DISCONNECTED:
            await connectDevice();
            break;
        case FlashingState.CONNECTED:
            await flashDevice();
            break;
        // Other states have disabled button, so no action needed
    }
}

export function initializeFlashingModule({ setActiveTab, getSelectedVersion }: { setActiveTab: (tabName: string) => void; getSelectedVersion: () => Version | null }) {
    setActiveTabCallback = setActiveTab;
    getSelectedVersionCallback = getSelectedVersion;
    if (customInstallButton) {
        customInstallButton.addEventListener('click', handleInstallButtonClick);
    }
    updateButtonState(FlashingState.DISCONNECTED); // Initialize button state
}