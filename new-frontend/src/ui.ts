// ui.ts for Custom Design v4 - Final
import { term, serialMonitorTerminal, startSerialMonitor, stopSerialMonitor } from './esptool-wrapper';
import { getAllDevices, type Firmware, type Version } from './api'; // Import necessary types and functions

// Tell TypeScript that anime exists on the global scope (from CDN)
declare const anime: any;

// Main page elements
const firmwareSelectionSection = document.getElementById('firmware-selection-section');
const versionSelectionSection = document.getElementById('version-selection-section');
const installSection = document.getElementById('install-section');

// Firmware selection elements (on main page)
const firmwareSelect = document.getElementById('firmware-select') as HTMLSelectElement;
const versionSelect = document.getElementById('version-select') as HTMLSelectElement;

// Device selection elements (on main page)
const selectDeviceButtonMain = document.getElementById('select-device-button-main');
const selectedDeviceDisplay = document.getElementById('selected-device-display');
const selectedDeviceImage = document.getElementById('selected-device-image') as HTMLImageElement;
const selectedDeviceName = document.getElementById('selected-device-name');

// Modal elements (for device selection)
const deviceModal = document.getElementById('device-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDeviceGrid = document.getElementById('modal-device-grid'); // This will now show the actual devices

// Console Tab elements
const consoleTabs = document.querySelectorAll('.console-tab');
const tabPanes = document.querySelectorAll('.tab-pane');

// --- Callbacks ---
type DeviceSelectCallback = (deviceId: string) => void;
type FirmwareSelectCallback = (firmwareId: string) => void;
type VersionSelectCallback = (versionId: string) => void;

let onDeviceSelectCallback: DeviceSelectCallback | null = null;
let onFirmwareSelectCallback: FirmwareSelectCallback | null = null;
let onVersionSelectCallback: VersionSelectCallback | null = null;

export function setSelectionCallbacks(
    d: DeviceSelectCallback, f: FirmwareSelectCallback, v: VersionSelectCallback
) {
    onDeviceSelectCallback = d;
    onFirmwareSelectCallback = f;
    onVersionSelectCallback = v;
}

// --- UI Control ---

function animateSection(element: HTMLElement | null, show: boolean) {
    if (!element) return;
    
    // Ensure anime.js is loaded before attempting animations
    if (typeof anime === 'undefined') {
        element.style.opacity = show ? '1' : '0';
        element.style.display = show ? 'block' : 'none';
        return;
    }

    const isVisible = element.style.display === 'block';
    if (show === isVisible) return;

    if (show) {
        element.style.display = 'block';
        anime({
            targets: element,
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 400,
            easing: 'easeOutCubic'
        });
    } else {
        anime({
            targets: element,
            opacity: 0,
            duration: 300,
            easing: 'easeInCubic',
            complete: () => {
                element.style.display = 'none';
            }
        });
    }
}

function showModal(modalElement: HTMLElement | null, show: boolean) {
    if (!modalElement) return;
    if (show) {
        modalElement.classList.add('is-visible');
    } else {
        modalElement.classList.remove('is-visible');
    }
}

export function displayError(elementId: string, error: Error) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="error-message">${error.message}</div>`;
        console.error(error);
    }
}

function createCard(id: string, name: string, imageUrl: string): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'selection-card';
    card.dataset.id = id;
    card.innerHTML = `<img src="${imageUrl}" alt="${name}"><span>${name}</span>`;
    return card;
}

// --- UI Population ---

// This function now populates the MODAL with devices
export function populateDeviceSelectionModal() {
    if (!modalDeviceGrid || !deviceModal) return;

    modalDeviceGrid.innerHTML = '<p>正在加载设备...</p>';
    showModal(deviceModal, true); // Show the modal immediately

    const devices = getAllDevices(); // Get all devices from API
    
    if (devices.length === 0) {
        modalDeviceGrid.innerHTML = '<p>没有找到任何设备。</p>';
        return;
    }

    modalDeviceGrid.innerHTML = ''; // Clear loading text
    devices.forEach(device => {
        const card = createCard(device.id, device.name, device.image);
        card.addEventListener('click', () => {
            // Update the main page with selected device info
            if (selectedDeviceDisplay && selectedDeviceImage && selectedDeviceName) {
                selectedDeviceImage.src = device.image;
                selectedDeviceImage.alt = device.name;
                selectedDeviceName.textContent = device.name;
                selectedDeviceDisplay.style.display = 'flex'; // Show the selected device info
                if (selectDeviceButtonMain) {
                    selectDeviceButtonMain.style.display = 'none'; // Hide the 'Select Device' button
                }
            }

            showModal(deviceModal, false); // Hide the modal
            animateSection(firmwareSelectionSection, true); // Show firmware selection
            animateSection(versionSelectionSection, false); // Hide version selection
            animateSection(installSection, false); // Hide install section
            onDeviceSelectCallback?.(device.id); // Trigger callback
        });
        modalDeviceGrid.appendChild(card);
    });
}

// This function populates the firmware selection dropdown
export function populateFirmwareUI(firmwares: Firmware[]) {
    if (!firmwareSelect) return;

    firmwareSelect.innerHTML = '<option value="">选择固件</option>'; // Clear existing options and add default
    firmwareSelect.disabled = true; // Disable until options are loaded

    if (firmwares.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '该设备下没有可用的固件';
        firmwareSelect.appendChild(option);
        return;
    }

    firmwares.forEach(firmware => {
        const option = document.createElement('option');
        option.value = firmware.id;
        option.textContent = firmware.name;
        firmwareSelect.appendChild(option);
    });

    firmwareSelect.disabled = false;
    // Remove existing event listeners to prevent duplicates
    // This is safer than { once: true } if populateFirmwareUI can be called multiple times for the same select element
    const oldFirmwareSelect = firmwareSelect;
    const newFirmwareSelect = oldFirmwareSelect.cloneNode(true) as HTMLSelectElement;
    oldFirmwareSelect.parentNode?.replaceChild(newFirmwareSelect, oldFirmwareSelect);

    newFirmwareSelect.addEventListener('change', (event) => {
        const selectedFirmwareId = (event.target as HTMLSelectElement).value;
        if (selectedFirmwareId) {
            onFirmwareSelectCallback?.(selectedFirmwareId);
            animateSection(versionSelectionSection, true); // Show version selection
            animateSection(installSection, false); // Hide install section
        } else {
            // If "选择固件" is selected, hide subsequent sections
            animateSection(versionSelectionSection, false);
            animateSection(installSection, false);
        }
    });
}


export function populateVersionsUI(versions: Version[]) {
    if (!versionSelect) return;

    versionSelect.innerHTML = '<option value="">选择版本</option>'; // Clear existing options and add default
    versionSelect.disabled = true; // Disable until options are loaded

    if (versions.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '该固件下没有可用的版本。';
        versionSelect.appendChild(option);
        return;
    }

    versions.forEach(version => {
        const option = document.createElement('option');
        option.value = version.id;
        option.textContent = version.name;
        versionSelect.appendChild(option);
    });

    versionSelect.disabled = false;
    // Remove existing event listeners to prevent duplicates
    const oldVersionSelect = versionSelect;
    const newVersionSelect = oldVersionSelect.cloneNode(true) as HTMLSelectElement;
    oldVersionSelect.parentNode?.replaceChild(newVersionSelect, oldVersionSelect);

    newVersionSelect.addEventListener('change', (event) => {
        const selectedVersionId = (event.target as HTMLSelectElement).value;
        if (selectedVersionId) {
            onVersionSelectCallback?.(selectedVersionId);
            animateSection(installSection, true); // Show install section
        } else {
            animateSection(installSection, false); // Hide install section
        }
    });
}


// --- Event Listeners & Initializers ---

export function initConsoleTabs() {
    const clearConsoleButton = document.getElementById('clear-console-button');
    const clearSerialButton = document.getElementById('clear-serial-button');

    consoleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            setActiveTab(tabName);
        });
    });

    clearConsoleButton?.addEventListener('click', () => term.clear());
    clearSerialButton?.addEventListener('click', () => serialMonitorTerminal.clear());
}

export function setActiveTab(tabName: string | null) {
    if (!tabName) return;
    
    // Control serial monitor based on tab
    if (tabName === 'serial') {
        startSerialMonitor();
    } else {
        stopSerialMonitor();
    }

    consoleTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    tabPanes.forEach(pane => {
        if (pane.getAttribute('data-tab-content') === tabName) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
}

closeModalBtn?.addEventListener('click', () => showModal(deviceModal, false));
deviceModal?.addEventListener('click', (e) => {
    if (e.target === deviceModal) {
        showModal(deviceModal, false);
    }
});

const themeSwitcher = document.getElementById('theme-switcher');
themeSwitcher?.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    document.body.classList.toggle('dark-mode');
});

// Set initial theme
document.body.classList.add('dark-mode');

// Event listener for the main 'Select Device' button
selectDeviceButtonMain?.addEventListener('click', () => {
    populateDeviceSelectionModal();
    animateSection(firmwareSelectionSection, false); // Hide firmware selection
    animateSection(versionSelectionSection, false); // Hide version selection
    animateSection(installSection, false); // Hide install section
});

// Initial state: hide all sections except project selection
animateSection(firmwareSelectionSection, false);
animateSection(versionSelectionSection, false);
animateSection(installSection, false);

// Initial rendering of main screen. The main screen now just shows the button.
// The actual population of the modal happens when the button is clicked.
