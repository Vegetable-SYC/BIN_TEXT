// new-frontend/src/types/webserial.d.ts
interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
}

interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
}

declare class SerialPort {
    readonly readable: ReadableStream;
    readonly writable: WritableStream;
    usbVendorId?: number;
    usbProductId?: number;
    constructor(port: any); // Simplified constructor for declaration
    open(options: any): Promise<void>; // Simplified options
    close(): Promise<void>;
    forget(): Promise<void>;
    getInfo(): { usbProductId?: number; usbVendorId?: number; };

    // Add methods/properties that esptool-js might use
    getSignals(): Promise<any>;
    setSignals(signals: any): Promise<void>;
    // event handlers
    onconnect: ((this: SerialPort, ev: Event) => any) | null;
    ondisconnect: ((this: SerialPort, ev: Event) => any) | null;
}

interface Navigator {
    readonly serial: Serial;
}

declare class Serial {
    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    // event handlers
    onconnect: ((this: Serial, ev: Event) => any) | null;
    ondisconnect: ((this: Serial, ev: Event) => any) | null;
}
