import generatorHelper from "@prisma/generator-helper";
import { generateCrud } from "./crudGenerator/index.js";
import { generateInputs } from "./inputsGenerator/index.js";
import { getConfig, type ExtendedGeneratorOptions } from "./utils/config.js";

// Re-exported for backwards compatibility; the type now lives in config.ts to
// avoid a config.ts <-> generator.ts import cycle.
export type { ExtendedGeneratorOptions };

const { generatorHandler } = generatorHelper;

generatorHandler({
    onManifest: () => ({
        prettyName: "Pothos inputs & crud integration",
        requiresGenerators: ["prisma-client-js", "prisma-pothos-types"],
        defaultOutput: "./generated/inputs.ts",
    }),
    onGenerate: async (options) => {
        const generatorConfig: ExtendedGeneratorOptions = {
            ...options,
            ...options.generator.config,
        };
        const config = await getConfig({
            extendedGeneratorOptions: generatorConfig,
        });

        await generateCrud({ config, dmmf: options.dmmf });
        await generateInputs({ config, dmmf: options.dmmf });
    },
});
