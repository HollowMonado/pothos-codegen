import { rmSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, it } from "vitest";
import { generateCrud } from "../src/crudGenerator/index.ts";
import { getDefaultConfig } from "../src/utils/config.ts";
import { getSampleDMMF } from "./data/getPrismaSchema.ts";

const outputDir = path.join(__dirname, ".tmp-crud-output");

afterAll(() => {
    rmSync(outputDir, { recursive: true, force: true });
});

describe("crudGenerator", () => {
    it("should generate all files", async () => {
        const dmmf = await getSampleDMMF("complex");
        const config = getDefaultConfig();
        config.global.outputDir = outputDir;
        await generateCrud({ config, dmmf });
    });
});
