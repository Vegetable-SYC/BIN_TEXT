/*
  This file is a TypeScript-adapted version of the working `esptool-integration.js`
  from the 'example' directory. It has been modified to use the exact same dependencies
  as the example to resolve flashing issues.
*/
import { ESPLoader, Transport } from './esptool-js/bundle.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

// Let TypeScript know about the global CryptoJS loaded from the CDN script in index.html
declare const window: any;

// --- Xterm.js 终端初始化 ---
const term = new Terminal({
    cols: 80,
    rows: 20,
    convertEol: true,
    theme: {
        background: '#000',
        foreground: '#0F0'
    }
});
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

const serialMonitorTerminal = new Terminal({
    convertEol: true,
    theme: {
        background: '#1E1E1E',
        foreground: '#FFFFFF'
    }
});
const monitorFitAddon = new FitAddon();
serialMonitorTerminal.loadAddon(monitorFitAddon);

const consoleTerminal = {
    clean: () => term.clear(),
    writeLine: (data: string) => term.writeln(data),
    write: (data: string) => term.write(data),
};

// --- ESPLoader相关状态变量 ---
let esploader: ESPLoader | null = null;
let transport: Transport | null = null;
let device: SerialPort | null = null;
let isMonitoring = false;
let monitorReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

async function readLoopForMonitor() {
    if (!transport || !transport.device.readable) return;
    try {
        monitorReader = transport.device.readable.getReader();
        while (true) {
            const { value, done } = await monitorReader!.read();
            if (done) break;
            serialMonitorTerminal.write(value);
        }
    } catch (error) {
        // Ignore errors
    } finally {
        if (monitorReader) {
            monitorReader.releaseLock();
            monitorReader = null;
        }
    }
}

async function startSerialMonitor() {
    if (isMonitoring || !transport) return;
    isMonitoring = true;
    transport.slipReaderEnabled = false;
    readLoopForMonitor();
}

async function stopSerialMonitor() {
    if (!isMonitoring) return;
    isMonitoring = false;
    if (monitorReader) {
        try {
            await monitorReader.cancel();
        } catch (error) {
            // Ignore errors
        }
    }
    if (transport) {
        transport.slipReaderEnabled = true;
    }
}

async function initESPLoader(baudrate: number): Promise<string> {
    try {
        consoleTerminal.clean();
        consoleTerminal.writeLine("Attempting to connect...");
        if (device === null) {
            device = await navigator.serial.requestPort();
            transport = new Transport(device, true);
        }
        const flashOptions: any = {
            transport,
            baudrate: baudrate,
            terminal: consoleTerminal,
            debugLogging: false,
            flashSize: "keep", // 尝试使用 "keep" 而非 "detect"
        };
        esploader = new ESPLoader(flashOptions);
        const chipName = await esploader.main();
        consoleTerminal.writeLine(`ESPLoader initialized. Detected chip: ${chipName}`);
        return chipName;
    } catch (error: any) {
        console.error("Failed to initialize ESPLoader:", error);
        consoleTerminal.writeLine(`Connection failed: ${error.message}`);
        consoleTerminal.writeLine("Please ensure the device is in download mode (hold BOOT, press/release RESET, then release BOOT).");
        if (transport) {
            await transport.disconnect();
        }
        device = null;
        transport = null;
        esploader = null;
        throw error;
    }
}

async function disconnectESPLoader() {
    try {
        if (transport) {
            await transport.disconnect();
        }
    } catch (error) {
        console.error("Error during disconnect:", error);
    } finally {
        transport = null;
        device = null;
        esploader = null;
        consoleTerminal.writeLine("ESPLoader disconnected.");
    }
}

async function fetchBinaryFile(filePath: string): Promise<string> {
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(buffer), byte => String.fromCharCode(byte)).join('');
}

async function startFlashing(selectedVersion: { manifest_path: string }, eraseFlash: boolean) {
    if (!esploader) {
        consoleTerminal.writeLine("ESPLoader is not initialized. Please connect a device first.");
        throw new Error("ESPLoader is not initialized. Please connect a device first.");
    }
    try {
        consoleTerminal.clean();
        consoleTerminal.writeLine("Starting flashing process...");
        if (eraseFlash) {
            consoleTerminal.writeLine("Erasing flash (this may take a while)...");
            await esploader.eraseFlash();
            consoleTerminal.writeLine("Flash erase complete.");
        }
        const manifestPath = selectedVersion.manifest_path;
        const basePath = manifestPath.substring(0, manifestPath.lastIndexOf('/') + 1);
        const manifestResponse = await fetch(manifestPath);
        if (!manifestResponse.ok) {
            throw new Error(`Failed to fetch manifest: ${manifestResponse.statusText}`);
        }
        const manifest = await manifestResponse.json();
        const fileArray: Array<{ data: string; address: number; }> = [];
        for (const build of manifest.builds) {
            for (const part of build.parts) {
                const binaryPath = `${basePath}${part.path}`;
                consoleTerminal.writeLine(`Fetching ${part.path} at 0x${part.offset.toString(16)}...`);
                const binaryData = await fetchBinaryFile(binaryPath);
                fileArray.push({ data: binaryData, address: part.offset });
            }
        }
        let lastProgressLine = "";
        const progressBar = (fileIndex: number, written: number, total: number) => {
            const fileName = fileArray[fileIndex].data.length > 0 ? `File ${fileIndex + 1}/${fileArray.length}` : `Empty file ${fileIndex + 1}/${fileArray.length}`;
            const percentage = ((written / total) * 100).toFixed(0);
            const progressBarLength = 20;
            const filled = Math.round(progressBarLength * (written / total));
            const empty = progressBarLength - filled;
            const bar = '[' + '█'.repeat(filled) + '-'.repeat(empty) + ']';
            const newLine = `${fileName} ${bar} ${percentage}% `;
            if (newLine !== lastProgressLine) {
                consoleTerminal.write(newLine + " ".repeat(Math.max(0, lastProgressLine.length - newLine.length)));
                lastProgressLine = newLine;
            }
        };
        const flashOptions: any = {
            fileArray: fileArray,
            eraseAll: manifest.new_install_prompt_erase || false,
            compress: true,
            flashMode: "keep",
            flashFreq: "keep",
            reportProgress: progressBar,
            // CRITICAL: Use window.CryptoJS, loaded from CDN, to match the example.
            calculateMD5Hash: (image: string) => window.CryptoJS.MD5(window.CryptoJS.enc.Latin1.parse(image)).toString(),
        };
        await esploader.writeFlash(flashOptions);
        await esploader.after();
        consoleTerminal.writeLine("\n\rFlashing complete!");
    } catch (error: any) {
        console.error("Flashing failed:", error);
        consoleTerminal.writeLine(`\n\rFlashing failed: ${error.message}`);
        throw error;
    }
}

async function getSerialPortInfo() {
    if (!device || !transport || !esploader) {
        return null;
    }
    const usbVendorId = device.usbVendorId ? `0x${device.usbVendorId.toString(16).padStart(4, '0')}` : 'N/A';
    const usbProductId = device.usbProductId ? `0x${device.usbProductId.toString(16).padStart(4, '0')}` : 'N/A';
    const chipName = esploader.chip ? (esploader.chip as any).CHIP_NAME : 'N/A';
    return {
        usbVendorId,
        usbProductId,
        baudRate: transport.baudrate,
        chipName,
    };
}

function getConnectedPort() {
    return device;
}

async function changeBaudRate(newBaudRate: number) {
    if (transport) {
        await transport.disconnect();
        await transport.connect(newBaudRate);
    }
}

export {
    initESPLoader,
    disconnectESPLoader,
    startFlashing,
    getSerialPortInfo,
    getConnectedPort,
    consoleTerminal,
    term,
    fitAddon,
    changeBaudRate,
    serialMonitorTerminal,
    monitorFitAddon,
    startSerialMonitor,
    stopSerialMonitor
};