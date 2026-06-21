import { rmSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, it } from "vitest";
import { generateInputs } from "../src/inputsGenerator/index.ts";
import { getDefaultConfig } from "../src/utils/config.ts";
import { getSampleDMMF } from "./data/getPrismaSchema.ts";

const outputDir = path.join(__dirname, ".tmp-inputs-output");

afterAll(() => {
    rmSync(outputDir, { recursive: true, force: true });
});

describe("inputsGenerator", () => {
    it("should generate inputs", async () => {
        const dmmf = await getSampleDMMF("complex");
        const config = getDefaultConfig();
        config.global.outputDir = outputDir;
        await generateInputs({ config, dmmf });
    });
});
