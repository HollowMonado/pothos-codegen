import { ExtendedGeneratorOptions } from "generator.js";
import path from "path";

/** Interface used to configure generator behavior */
export interface Config {
    /** Input type generation config */
    inputs?: {
        /** How to import the Prisma namespace. Default: `"import { Prisma } from '.prisma/client';"` */
        prismaImporter?: string;
        /** List of excluded scalars from generated output */
        excludeScalars?: string[];
        excludeInputFields?: {
            create?: Record<string | "$all", string[]>;
            update?: Record<string | "$all", string[]>;
            where?: Record<string | "$all", string[]>;
            orderBy?: Record<string | "$all", string[]>;
        };
        /** TODO: Map all Prisma fields with "@id" attribute to Graphql "ID" Scalar.
         *
         * ATTENTION: Mapping non String requires a conversion inside resolver, once GraphQl ID Input are coerced to String by definition. Default: false */
        mapIdFieldsToGraphqlId?: false | "WhereUniqueInputs";
    };
    /** CRUD generation config */
    crud?: {
        /** How to import the inputs. Default `"import * as Inputs from '../inputs';"` */
        inputsImporter?: string;
        /** How to import the Prisma namespace at the objects.ts file. Default `"import { Prisma } from '.prisma/client';"`. Please use "resolverImports" to import prismaClient at resolvers. */
        prismaImporter?: string;
        /** How to call the prisma client. Default `'context.prisma'` */
        prismaCaller?: string;
        /** TODO: Any additional imports you might want to add to the resolvers (e.g. your prisma client). Default: `''` */
        resolverImports?: string;
        /** An array of parts of resolver names to be excluded from generation. Ie: ["User"] Default: [] */
        excludeResolversContain?: string[];
        /** An array of resolver names to be excluded from generation. Ie: ["upsertOneComment"] Default: [] */
        excludeResolversExact?: string[];
        /** An array of parts of resolver names to be included from generation (to bypass exclude contain). Ie: if exclude ["User"], include ["UserReputation"] Default: [] */
        includeResolversContain?: string[];
        /** An array of resolver names to be included from generation (to bypass exclude contain). Ie: if exclude ["User"], include ["UserReputation"] Default: [] */
        includeResolversExact?: string[];
        /** TODO: Map all Prisma fields with "@id" attribute to Graphql "ID" Scalar. Default: 'Objects' */
        mapIdFieldsToGraphqlId?: false | "Objects";
    };
    /** Global config */
    global?: {
        /** Disable generation of nested create, update and delete input types. Default: `true` */
        noNestedInput: boolean;
        /** Caution: This delete the whole folder (Only use if the folder only has auto generated contents). A boolean to delete output dir before generate. Default: False */
        deleteOutputDirBeforeGenerate?: boolean;
        /** Directory to generate crud code into from project root. Default: `'./generated'` */
        outputDir?: string;
        /** Location of builder. Default: './builder', */
        builderImportPath?: string;
    };
}

/** Type representing a configuration filled with default values where the original config was missing them, for internal purposes */
export type ConfigInternal = {
    inputs: NonNullable<Required<Config["inputs"]>>;
    crud: NonNullable<Required<Config["crud"]>>;
    global: NonNullable<Required<Config["global"]>>;
};

/** Parses the configuration file path */
export function getConfigPath({
    generatorConfigPath,
    schemaPath,
}: {
    generatorConfigPath?: string;
    schemaPath: string;
}): string | undefined {
    const envConfigPath = process.env.POTHOS_CRUD_CONFIG_PATH;
    const configPath = envConfigPath || generatorConfigPath; // use env var if set

    if (!configPath) return undefined;

    const schemaDirName = path.dirname(schemaPath);
    const optionsPath = path.join(schemaDirName, configPath);

    return optionsPath;
}

/** Parses the configuration file based on the provided schema and config paths */
export async function parseConfig({ configPath }: { configPath: string }): Promise<Config> {
    const importedFile = await import(configPath); // throw error if dont exist
    const { crud, global, inputs }: Config = importedFile.default || {};

    return { crud, global, inputs };
}

export function getDefaultConfig(): ConfigInternal {
    return {
        inputs: {
            prismaImporter: `import { Prisma } from '.prisma/client';`,
            excludeScalars: [],
            excludeInputFields: {},
            mapIdFieldsToGraphqlId: false,
        },
        crud: {
            inputsImporter: `import * as Inputs from '../inputs.js';`,
            prismaImporter: `import { Prisma } from '.prisma/client';`,
            prismaCaller: "context.prisma",
            resolverImports: "",
            excludeResolversContain: [],
            excludeResolversExact: [],
            includeResolversContain: [],
            includeResolversExact: [],
            mapIdFieldsToGraphqlId: "Objects",
        },
        global: {
            noNestedInput: true,
            outputDir: "./generated",
            deleteOutputDirBeforeGenerate: false,
            builderImportPath: "./builder",
        },
    };
}

/** Receives the config path from generator options, loads the config from file, fills out the default values, and returns it */
export async function getConfig({
    extendedGeneratorOptions,
}: {
    extendedGeneratorOptions: ExtendedGeneratorOptions;
}): Promise<ConfigInternal> {
    const { generatorConfigPath, schemaPath } = extendedGeneratorOptions;
    const configPath = getConfigPath({ generatorConfigPath, schemaPath });

    if (!configPath) return getDefaultConfig();

    const { inputs, crud, global } = await parseConfig({ configPath });
    const defaultConfig = getDefaultConfig();

    return {
        inputs: { ...defaultConfig.inputs, ...inputs },
        crud: { ...defaultConfig.crud, ...crud },
        global: { ...defaultConfig.global, ...global },
    } satisfies ConfigInternal;
}
