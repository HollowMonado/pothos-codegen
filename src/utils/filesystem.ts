import { PathLike } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "node:process";

export async function debugLog(value: string, timestamp = true) {
    if (!env.isTesting) return;
    await fs.appendFile(
        "log.txt",
        `${timestamp ? `${new Date().toISOString()}: ` : ""}${JSON.stringify(value)},\n`
    );
}

export function deleteFolder(path: PathLike) {
    return fs.rm(path, { recursive: true, force: true });
}

export async function writePothosFile({
    content,
    destination,
}: {
    content: string;
    destination: string;
}): Promise<void> {
    await debugLog(`Writing to ${destination}`);

    try {
        const dir = path.dirname(destination);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(destination, content, { flag: "w" });
    } catch (err) {
        await debugLog(JSON.stringify(err));
    }
}
