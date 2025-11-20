// ui.ts for Custom Design v4 - Final
import { getProjectConfig, getDeviceConfig, getManifestPath, getAllProjects } from './api';
import { term, serialMonitorTerminal, startSerialMonitor, stopSerialMonitor } from './esptool-wrapper';

// Tell TypeScript that anime exists on the global scope (from CDN)
declare const anime: any;

const projectGrid = document.getElementById('project-grid');
const deviceGridContainer = document.getElementById('device-grid-container');
const modalDeviceGrid = document.getElementById('modal-device-grid');
const versionButtons = document.getElementById('version-buttons');

const projectSelectionSection = document.getElementById('project-selection');
const deviceSelectionSection = document.getElementById('device-selection');
const versionSelectionSection = document.getElementById('version-selection');
const installSection = document.getElementById('install-section');

// Modal elements
const deviceModal = document.getElementById('device-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

// Console Tab elements
const consoleTabs = document.querySelectorAll('.console-tab');
const tabPanes = document.querySelectorAll('.tab-pane');

// --- Callbacks ---
type ProjectSelectCallback = (projectId: string) => void;
type DeviceSelectCallback = (projectId: string, deviceId: string) => void;
type VersionSelectCallback = (manifestPath: string) => void;

let onProjectSelect: ProjectSelectCallback | null = null;
let onDeviceSelect: DeviceSelectCallback | null = null;
let onVersionSelect: VersionSelectCallback | null = null;

export function setSelectionCallbacks(
    p: ProjectSelectCallback, d: DeviceSelectCallback, v: VersionSelectCallback
) {
    onProjectSelect = p;
    onDeviceSelect = d;
    onVersionSelect = v;
}

// --- UI Control ---

function animateSection(element: HTMLElement | null, show: boolean) {
    if (!element) return;
    
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

function showModal(show: boolean) {
    if (!deviceModal) return;
    if (show) {
        deviceModal.classList.add('is-visible');
    } else {
        deviceModal.classList.remove('is-visible');
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

export async function populateProjectsUI() {
    if (!projectGrid || !projectSelectionSection) return;
    
    const title = projectSelectionSection.querySelector('.step-title');
    if (title) title.innerHTML = `选择一个项目 <p class="step-subtitle">请选择您希望刷写固件的项目。</p>`;
    
    projectGrid.innerHTML = '<p>正在加载项目...</p>';
    animateSection(projectSelectionSection, true);
    
    try {
        const projectFolders = await getAllProjects();
        projectGrid.innerHTML = '';

        if (projectFolders.length === 0) {
            projectGrid.innerHTML = '<p>没有找到任何项目。</p>';
            return;
        }

        projectFolders.forEach(folder => {
            getProjectConfig(folder).then(projData => {
                const card = createCard(folder, projData.name, `/firmware/${folder}/${projData.image}`);
                card.style.opacity = '0'; // For animation
                card.addEventListener('click', () => {
                    document.querySelectorAll('#project-grid .selection-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    animateSection(versionSelectionSection, false);
                    animateSection(installSection, false);
                    onProjectSelect?.(folder);
                });
                projectGrid.appendChild(card);
            }).catch(innerError => {
                console.warn(`Skipping project "${folder}" due to error:`, innerError);
            });
        });

        // Staggered animation for cards
        anime({
            targets: '#project-grid .selection-card',
            opacity: 1,
            translateY: [10, 0],
            delay: anime.stagger(100)
        });

    } catch (error: any) {
        displayError('project-grid', error);
    }
}

export async function populateDevicesUI(projectId: string, deviceFolders: string[]) {
    if (!modalDeviceGrid || !deviceSelectionSection || !deviceGridContainer) return;

    const title = deviceSelectionSection.querySelector('.step-title');
    if (title) title.innerHTML = `选择您的设备 <p class="step-subtitle">然后, 选择您的硬件设备型号。</p>`;

    const btnHtml = `<button id="select-device-button" class="install-button">选择设备</button>`;
    deviceGridContainer.innerHTML = btnHtml;
    const selectDeviceButton = document.getElementById('select-device-button');
    selectDeviceButton?.addEventListener('click', () => showModal(true));
    
    animateSection(deviceSelectionSection, true);

    if (!deviceFolders || deviceFolders.length === 0) {
        modalDeviceGrid.innerHTML = '<p>该项目下没有可用的设备。</p>';
        return;
    }
    
    modalDeviceGrid.innerHTML = '';
    for (const folder of deviceFolders) {
        try {
            const devData = await getDeviceConfig(projectId, folder);
            const card = createCard(folder, devData.name, `/firmware/${projectId}/${folder}/${devData.image}`);
            card.addEventListener('click', () => {
                if (selectDeviceButton) {
                    selectDeviceButton.textContent = devData.name;
                    selectDeviceButton.classList.add('selected');
                }
                showModal(false);
                animateSection(installSection, false);
                onDeviceSelect?.(projectId, folder);
            });
            modalDeviceGrid.appendChild(card);
        } catch(error: any) {
             displayError('modal-device-grid', error); 
             return; 
        }
    }
}

export function populateVersionsUI(projectId: string, deviceId: string, versionFolders: string[]) {
    if (!versionButtons || !versionSelectionSection) return;

    const title = versionSelectionSection.querySelector('.step-title');
    if (title) title.innerHTML = `选择固件版本 <p class="step-subtitle">最后, 选择您想安装的固件版本。</p>`;

    versionButtons.innerHTML = '';
    animateSection(versionSelectionSection, true);

    if (!versionFolders || versionFolders.length === 0) {
        versionButtons.innerHTML = `<p>该设备下没有可用的固件版本。</p>`;
        return;
    }

    for (const folder of versionFolders) {
        const button = document.createElement('a');
        button.className = 'version-button';
        button.textContent = folder;
        
        button.addEventListener('click', () => {
            document.querySelectorAll('#version-buttons .version-button').forEach(b => b.classList.remove('selected'));
            button.classList.add('selected');
            animateSection(installSection, true);
            onVersionSelect?.(getManifestPath(projectId, deviceId, folder));
        });
        versionButtons.appendChild(button);
    }
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

closeModalBtn?.addEventListener('click', () => showModal(false));
deviceModal?.addEventListener('click', (e) => {
    if (e.target === deviceModal) {
        showModal(false);
    }
});

const themeSwitcher = document.getElementById('theme-switcher');
themeSwitcher?.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    document.body.classList.toggle('dark-mode');
});

// Set initial theme
document.body.classList.add('dark-mode');