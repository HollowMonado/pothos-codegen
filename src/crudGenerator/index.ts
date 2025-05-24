import type { DMMF } from "@prisma/generator-helper";
import path from "node:path";
import { ConfigInternal } from "utils/config.js";
import { deleteFolder, writePothosFile } from "utils/filesystem.js";
import { makeAutoCrudFileTemplate, makeObjectsFileTemplate, makeUtilsTemplate } from "./templates/root";
import { generateModel } from "./utils/generator.js";

export async function generateCrud({ config, dmmf }: { config: ConfigInternal; dmmf: DMMF.Document }): Promise<void> {
    if (config.global.deleteOutputDirBeforeGenerate) {
        await deleteFolder(path.join(config.global.outputDir));
    }

    // Generate CRUD directories (e.g. User, Comment, ...)

    const generatedModels = await generateAllModels({ config, dmmf });
    await generateUtilsFile({ config, dmmf });
    await generateObjectsFile({ config, dmmf });
    await generateAutocrudFile({ generatedModels, config, dmmf });
}

async function generateAllModels({ config, dmmf }: { config: ConfigInternal; dmmf: DMMF.Document }) {
    const modelNames = dmmf.datamodel.models.map((model) => model.name);
    return await Promise.all(
        modelNames.map(async (model) => {
            const generated = await generateModel(config, dmmf, model);
            return { model, generated };
        })
    );
}

async function generateAutocrudFile({
    config,
    dmmf,
    generatedModels,
}: {
    config: ConfigInternal;
    dmmf: DMMF.Document;
    generatedModels: Awaited<ReturnType<typeof generateAllModels>>;
}) {
    const imports = dmmf.datamodel.models
        .map((model) => `import * as ${model.name} from './${model.name}';`)
        .join("\n");
    const models = generatedModels.map((el) => ({
        model: el.model,
        reslovers: el.generated.resolvers,
    }));

    const modelsGenerated = dmmf.datamodel.models
        .map((model) => {
            return `  ${model.name}: {
    Object: ${model.name}.${model.name}Object,
    queries: ${(() => {
        const queries =
            models.find((el) => el.model === model.name)?.reslovers.filter((el) => el.type === "queries") || [];
        return `{\n${queries
            .map((el) => `      ${el.resolverName}: ${el.modelName}.${el.resolverName}${el.modelName}QueryObject,`)
            .join("\n")}\n    }`;
    })()},
    mutations: ${(() => {
        const mutations =
            models.find((el) => el.model === model.name)?.reslovers.filter((el) => el.type === "mutations") || [];
        return `{\n${mutations
            .map((el) => `      ${el.resolverName}: ${el.modelName}.${el.resolverName}${el.modelName}MutationObject,`)
            .join("\n")}\n    }`;
    })()},
  },`;
        })
        .join("\n");

    const fileLocation = path.join(config.global.outputDir, "autocrud.ts");
    await writePothosFile({
        content: makeAutoCrudFileTemplate({
            builderImportPath: config.global.builderImportPath,
            imports: imports,
            modelsGenerated: modelsGenerated,
        }),
        destination: fileLocation,
    });
}

// Generate root utils.ts file
async function generateUtilsFile({ config, dmmf }: { config: ConfigInternal; dmmf: DMMF.Document }) {
    const fileLocation = path.join(config.global.outputDir, "utils.ts");

    await writePothosFile({
        content: makeUtilsTemplate({
            builderImport: config.global.builderImportPath,
        }),
        destination: fileLocation,
    });
}

// Generate root objects.ts file (export all models + prisma objects)
async function generateObjectsFile({ config, dmmf }: { config: ConfigInternal; dmmf: DMMF.Document }) {
    const modelNames = dmmf.datamodel.models.map((model) => model.name);
    const modelNamesEachLine = modelNames.map((model) => `'${model}',`).join("\n  ");
    const fileLocationObjects = path.join(config.global.outputDir, "objects.ts");

    await writePothosFile({
        content: makeObjectsFileTemplate({
            prismaImporter: config.crud.prismaImporter,
            builderImportPath: config.global.builderImportPath,
            modelNames: modelNamesEachLine,
        }),
        destination: fileLocationObjects,
    });
}
