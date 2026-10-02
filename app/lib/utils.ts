/**
 * Converts a byte count to a compact, human-readable size.
 */
export function formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "0 KB";
    }

    const units = ["KB", "MB", "GB"];
    const sizeInKilobytes = bytes / 1024;
    const unitIndex = Math.min(
        Math.floor(Math.log(Math.max(sizeInKilobytes, 1)) / Math.log(1024)),
        units.length - 1
    );
    const size = sizeInKilobytes / 1024 ** unitIndex;

    return `${Number(size.toFixed(2))} ${units[unitIndex]}`;
}

export const generateUUID = () => crypto.randomUUID();
