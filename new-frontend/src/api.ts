
const FIRMWARE_BASE_PATH = "/firmware"; // Ensure this is correctly exported


export interface Version {
    id: string;
    name: string;
    manifest_path: string;
}

export interface Firmware {
    id: string;
    name: string;
    image: string;
    versions: Version[];
}

interface Device {
    id: string;
    name: string;
    image: string;
    firmwares: Firmware[];
}

interface AppConfig {
    devices: Device[];
}

let appConfig: AppConfig | null = null;

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export async function getAppConfig(): Promise<AppConfig> {
    if (appConfig) {
        return appConfig;
    }
    const configUrl = `${FIRMWARE_BASE_PATH}/config.json`;
    appConfig = await fetchJson<AppConfig>(configUrl);
    return appConfig;
}

export function getAllDevices(): Device[] {
    if (!appConfig) {
        throw new Error("App config not loaded. Call getAppConfig first.");
    }
    return appConfig.devices;
}

export function getDeviceById(deviceId: string): Device | undefined {
    if (!appConfig) {
        throw new Error("App config not loaded. Call getAppConfig first.");
    }
    return appConfig.devices.find(d => d.id === deviceId);
}

export function getFirmwareById(deviceId: string, firmwareId: string): Firmware | undefined {
    const device = getDeviceById(deviceId);
    if (!device) return undefined;
    return device.firmwares.find(f => f.id === firmwareId);
}

export function getVersionById(deviceId: string, firmwareId: string, versionId: string): Version | undefined {
    const firmware = getFirmwareById(deviceId, firmwareId);
    if (!firmware) return undefined;
    return firmware.versions.find(v => v.id === versionId);
}

export function getManifestPath(deviceId: string, firmwareId: string, versionId: string): string | undefined {
    const version = getVersionById(deviceId, firmwareId, versionId);
    return version ? version.manifest_path : undefined;
}