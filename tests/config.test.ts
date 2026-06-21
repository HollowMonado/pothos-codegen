import { afterEach, describe, expect, it } from "vitest";
import { ExtendedGeneratorOptions } from "../src/generator";
import * as config from "../src/utils/config";
import { getSampleDMMF } from "./data/getPrismaSchema.ts";

const cwd = process.cwd();

const generateOptions = async (
    generatorConfigPath?: string
): Promise<ExtendedGeneratorOptions> => {
    const dmmf = await getSampleDMMF("simple");

    return {
        datamodel: "",
        datasources: [],
        generator: {
            sourceFilePath: `${cwd}/tests/data/simpleSchema.prisma`,
            name: "pothosCrud",
            provider: {
                fromEnvVar: null,
                value: "ts-node --transpile-only ../../src/generator.ts",
            },
            output: {
                value: `${cwd}/src/generated/inputs.ts`,
                fromEnvVar: "null",
            },
            config: {},
            binaryTargets: [],
            previewFeatures: [],
        },
        generatorConfigPath,
        dmmf,
        otherGenerators: [
            {
                sourceFilePath: `${cwd}/tests/data/simpleSchema.prisma`,
                name: "client",
                provider: { fromEnvVar: null, value: "prisma-client-js" },
                output: {
                    value: `${cwd}/tests/data/@prisma/client`,
                    fromEnvVar: null,
                },
                config: {},
                binaryTargets: [],
                previewFeatures: [],
            },
            {
                sourceFilePath: `${cwd}/tests/data/simpleSchema.prisma`,
                name: "pothos",
                provider: { fromEnvVar: null, value: "prisma-pothos-types" },
                output: {
                    value: `${cwd}/tests/data/generated/objects.d.ts`,
                    fromEnvVar: null,
                },
                config: { clientOutput: ".prisma/client" },
                binaryTargets: [],
                previewFeatures: [],
                isCustomOutput: true,
            },
        ],
        schemaPath: `${cwd}/tests/data/simpleSchema.prisma`,
        version: "272861e07ab64f234d3ffc4094e32bd61775599c",
    } satisfies ExtendedGeneratorOptions;
};

afterEach(() => {
    delete process.env.POTHOS_CRUD_CONFIG_PATH;
});

describe("getConfigPath", () => {
    const { getConfigPath } = config;

    it("should return undefined", async () => {
        expect(
            getConfigPath({ generatorConfigPath: undefined, schemaPath: "." })
        ).toBeUndefined();
    });

    it("should return `POTHOS_CRUD_CONFIG_PATH`", async () => {
        const configPath = "../config-file-env";
        process.env.POTHOS_CRUD_CONFIG_PATH = configPath;

        expect(
            getConfigPath({ generatorConfigPath: undefined, schemaPath: "." })
        ).toBe(configPath);
    });

    it("should return `generatorConfigPath`", async () => {
        const generatorConfigPath = "../config-file-path";

        expect(getConfigPath({ generatorConfigPath, schemaPath: "." })).toBe(
            generatorConfigPath
        );
    });

    it("should return `POTHOS_CRUD_CONFIG_PATH` over `generatorConfigPath`", async () => {
        const configPath = "../config-file-env";
        process.env.POTHOS_CRUD_CONFIG_PATH = configPath;

        expect(
            getConfigPath({
                generatorConfigPath: "../config-file",
                schemaPath: ".",
            })
        ).toBe(configPath);
    });
});

describe("parseConfig", () => {
    const { parseConfig } = config;

    it(`should throw error if the file doesn't exist`, async () => {
        await expect(
            parseConfig({ configPath: "./does-not-exist" })
        ).rejects.toThrow(/does-not-exist/);
    });

    it(`should parse the config file`, async () => {
        const configs = await parseConfig({
            configPath: "../../tests/data/configs.js",
        });

        expect(configs).toEqual({
            crud: {
                outputDir: "./src/schema/__generated__/",
                excludeResolversContain: ["User"],
                prismaCaller: "context.db",
                disabled: false,
            },
            inputs: {
                prismaImporter: `import { Prisma } from '.prisma/client';`,
            },
            global: {
                deleteOutputDirBeforeGenerate: true,
            },
        });
    });
});

describe("getConfig", () => {
    const { getConfig, getDefaultConfig } = config;

    it(`should return the default config if a configPath doesn't exist`, async () => {
        const options = await generateOptions();
        const configs = await getConfig({ extendedGeneratorOptions: options });

        expect(configs).toEqual(getDefaultConfig());
    });

    it(`should return custom configuration merged with the defaults`, async () => {
        const options = await generateOptions("../data/configs.js");
        const configs = await getConfig({ extendedGeneratorOptions: options });
        const defaultConfig = getDefaultConfig();

        // Default config, with the overrides from tests/data/configs.js merged in.
        expect(configs).toEqual({
            inputs: {
                ...defaultConfig.inputs,
                prismaImporter: `import { Prisma } from '.prisma/client';`,
            },
            crud: {
                ...defaultConfig.crud,
                outputDir: "./src/schema/__generated__/",
                excludeResolversContain: ["User"],
                prismaCaller: "context.db",
                disabled: false,
            },
            global: {
                ...defaultConfig.global,
                deleteOutputDirBeforeGenerate: true,
            },
        });
    });
});
