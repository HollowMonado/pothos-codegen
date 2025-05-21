import { describe, it } from "vitest";
import { generateInputs } from "../src/inputsGenerator/index.ts";
import { getDefaultConfig } from "../src/utils/config.ts";
import { getSampleDMMF } from "./data/getPrismaSchema.ts";

describe("inputsGenerator", () => {
    it("should generate inputs", async () => {
        const dmmf = await getSampleDMMF("complex");
        const defaultConfig = getDefaultConfig();
        await generateInputs(defaultConfig, dmmf);
    });
});
