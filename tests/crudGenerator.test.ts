import { describe, it } from "vitest";
import { generateCrud } from "../src/crudGenerator/index.ts";
import { getDefaultConfig } from "../src/utils/config.ts";
import { getSampleDMMF } from "./data/getPrismaSchema.ts";

describe("crudGenerator", () => {
    it("should generate all files", async () => {
        const dmmf = await getSampleDMMF("complex");
        const defaultConfig = getDefaultConfig();
        await generateCrud(defaultConfig, dmmf);
    });
});
