import { afterEach, describe, expect, it, vi } from "vitest";
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

const matchImport = expect.stringMatching(/^import /);
const matchRelativePath = expect.stringMatching(/^\.\//);

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
        const fileName = "./does-not-exist";
        const regexp = new RegExp(`^Cannot find module '${fileName}'`);

        await expect(parseConfig(fileName)).rejects.toThrow(regexp);
    });

    it(`should parse the config file`, async () => {
        const configs = await parseConfig("../../tests/data/configs.js");

        expect(configs).toEqual({
            crud: expect.objectContaining({
                deleteOutputDirBeforeGenerate: expect.any(Boolean),
                disabled: expect.any(Boolean),
                excludeResolversContain: expect.arrayContaining([
                    expect.any(String),
                ]),
                outputDir: matchRelativePath,
                prismaCaller: expect.any(String),
            }),
            global: {},
            inputs: expect.objectContaining({
                outputFilePath: matchRelativePath,
                prismaImporter: matchImport,
            }),
        });
    });
});

describe("getConfig", () => {
    const { getConfig } = config;
    const getDefaultConfigMock = vi.spyOn(config, "getDefaultConfig");

    it(`should return the default config if a configPath doesn't exist`, async () => {
        const options = await generateOptions();
        const configs = await getConfig(options);

        expect(getDefaultConfigMock).toHaveBeenCalledWith();
        expect(configs).toEqual({
            crud: expect.objectContaining({
                deleteOutputDirBeforeGenerate: false,
                disabled: false,
                excludeResolversContain: [],
                excludeResolversExact: [],
                generateAutocrud: true,
                includeResolversContain: [],
                includeResolversExact: [],
                inputsImporter: `import * as Inputs from '../inputs';`,
                outputDir: "./generated",
                prismaCaller: "context.prisma",
                prismaImporter: `import { Prisma } from '.prisma/client';`,
                replacer: expect.any(Function),
            }),
            global: expect.objectContaining({
                afterGenerate: expect.any(Function),
                beforeGenerate: expect.any(Function),
                replacer: expect.any(Function),
            }),
            inputs: expect.objectContaining({
                excludeScalars: [],
                outputFilePath: "./generated/inputs.ts",
                prismaImporter: `import { Prisma } from '.prisma/client';`,
                replacer: expect.any(Function),
            }),
        });
    });

    it(`should return custom configuration merged with the defaults`, async () => {
        const options = await generateOptions("../data/configs.js");
        const configs = await getConfig(options);

        expect(getDefaultConfigMock).toHaveBeenCalledWith({});
        expect(configs).toEqual({
            crud: expect.objectContaining({
                deleteOutputDirBeforeGenerate: true,
                disabled: false,
                excludeResolversContain: ["User"],
                excludeResolversExact: [],
                generateAutocrud: true,
                includeResolversContain: [],
                includeResolversExact: [],
                inputsImporter: `import * as Inputs from '../inputs';`,
                outputDir: "./src/schema/__generated__/",
                prismaCaller: "context.db",
                prismaImporter: `import { Prisma } from '.prisma/client';`,
                replacer: expect.any(Function),
                resolverImports: "",
            }),
            global: expect.objectContaining({
                afterGenerate: expect.any(Function),
                beforeGenerate: expect.any(Function),
                replacer: expect.any(Function),
            }),
            inputs: expect.objectContaining({
                excludeScalars: [],
                outputFilePath: "./src/schema/__generated__/inputs.ts",
                prismaImporter: `import { Prisma } from '.prisma/client';`,
                replacer: expect.any(Function),
            }),
        });
    });
});
