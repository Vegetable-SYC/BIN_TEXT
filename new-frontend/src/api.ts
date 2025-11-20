const FIRMWARE_BASE_PATH = "/firmware"; // Adjusted path for Vite's static asset serving

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export async function getAllProjects(): Promise<string[]> {
    const projectsUrl = `${FIRMWARE_BASE_PATH}/ALL_Project.json`;
    return fetchJson<string[]>(projectsUrl);
}

export async function getProjectConfig(projectId: string): Promise<{ name: string; image: string; devices: string[] }> {
    const projectConfigUrl = `${FIRMWARE_BASE_PATH}/${projectId}/Project.json`;
    return fetchJson<{ name: string; image: string; devices: string[] }>(projectConfigUrl);
}

export async function getDeviceConfig(projectId: string, deviceId: string): Promise<{ name: string; image: string; versions: string[] }> {
    const deviceConfigUrl = `${FIRMWARE_BASE_PATH}/${projectId}/${deviceId}/Device.json`;
    return fetchJson<{ name: string; image: string; versions: string[] }>(deviceConfigUrl);
}

export function getManifestPath(projectId: string, deviceId: string, versionName: string): string {
    return `${FIRMWARE_BASE_PATH}/${projectId}/${deviceId}/${versionName}/Download.json`;
}
