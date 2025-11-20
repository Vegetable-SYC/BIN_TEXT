// flashing.ts
import {
    initESPLoader,
    disconnectESPLoader,
    startFlashing,
    term,
    serialMonitorTerminal,
    fitAddon,
    monitorFitAddon,
    startSerialMonitor,
    stopSerialMonitor
} from './esptool-wrapper';
import { displayError, setActiveTab } from './ui';

const customInstallButton = document.getElementById('custom-install-button');
const terminalLogElement = document.getElementById('terminal-log');
const serialMonitorLogElement = document.getElementById('serial-monitor-log');

let isConnected = false;
let currentManifestPath: string | null = null;
let areTerminalsInitialized = false;
let setActiveTabCallback: (tabName: string) => void;

export function setManifestPathForFlashing(manifestPath: string | null) {
    currentManifestPath = manifestPath;

    // Initialize terminals only once when they become visible
    if (!areTerminalsInitialized && terminalLogElement && serialMonitorLogElement) {
        term.open(terminalLogElement);
        fitAddon.fit();
        serialMonitorTerminal.open(serialMonitorLogElement);
        monitorFitAddon.fit();
        areTerminalsInitialized = true;
    }
}

export async function handleInstallButtonClick() {
    if (!customInstallButton) return;

    if (isConnected) {
        // Disconnect
        await disconnectESPLoader();
        customInstallButton.textContent = "Connect";
        isConnected = false;
        if (terminalLogElement) term.clear();
        if (serialMonitorLogElement) serialMonitorTerminal.clear();
        stopSerialMonitor();
    } else {
        // Connect
        if (!currentManifestPath) {
            alert('Please select a firmware version first.');
            return;
        }

        // Switch to the terminal tab automatically
        if(setActiveTabCallback) setActiveTabCallback('terminal');

        customInstallButton.textContent = "Connecting...";
        customInstallButton.disabled = true;

        try {
            term.clear();
            serialMonitorTerminal.clear();

            const chipName = await initESPLoader(115200); // Default baud rate
            console.log("Connected to chip:", chipName);
            customInstallButton.textContent = "Flash";
            isConnected = true;
            
            // Don't auto-start monitor, let user choose
            // startSerialMonitor(); 

            if (currentManifestPath) {
                await startFlashing({ manifest_path: currentManifestPath }, false);
                customInstallButton.textContent = "Disconnect";
            }

        } catch (error: any) {
            console.error("Connection or Flashing Error:", error);
            displayError('terminal-log-container', error);
            customInstallButton.textContent = "Connect";
            isConnected = false;
            stopSerialMonitor();
        } finally {
            customInstallButton.disabled = false;
        }
    }
}

export function initializeFlashingModule({ setActiveTab }: { setActiveTab: (tabName: string) => void; }) {
    setActiveTabCallback = setActiveTab;
    if (customInstallButton) {
        customInstallButton.addEventListener('click', handleInstallButtonClick);
    }
}