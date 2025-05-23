import generatorHelper, { GeneratorOptions } from "@prisma/generator-helper";
import { generateCrud } from "./crudGenerator/index.js";
import { generateInputs } from "./inputsGenerator/index.js";
import { getConfig } from "./utils/config.js";

const { generatorHandler } = generatorHelper;

// Types from the generator, in `schema.prisma`
type SchemaGeneratorExtensionOptions = { generatorConfigPath?: string };

// default config from generator, with the path option
export type ExtendedGeneratorOptions = SchemaGeneratorExtensionOptions &
    GeneratorOptions;

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
