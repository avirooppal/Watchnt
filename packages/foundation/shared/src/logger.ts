
export interface Logger {
    info(message: string, meta?: any): void;
    error(message: string, error?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

export const consoleLogger: Logger = {
    info: (msg, meta) => console.log(msg, meta || ''),
    error: (msg, err) => console.error(msg, err || ''),
    warn: (msg, meta) => console.warn(msg, meta || ''),
    debug: (msg, meta) => console.debug(msg, meta || '')
};
