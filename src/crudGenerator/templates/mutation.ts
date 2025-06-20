import { ConfigInternal } from "utils/config.js";
import { firstLetterLowerCase } from "utils/string.js";

export const mutationOperationNames = [
    "createMany",
    "createOne",
    "deleteMany",
    "deleteOne",
    "updateMany",
    "updateOne",
    "upsertOne",
] as const;
export type MutationOperation = (typeof mutationOperationNames)[number];
export const batchMutationOperations = ["updateMany", "deleteMany"];

function makeMutationTemplate({
    mutationOperation,
    modelName,
    builderImportPath,
    argsReturn,
    type,
    nullable,
    resolve,
}: {
    mutationOperation: MutationOperation;
    modelName: string;
    builderImportPath: string;
    argsReturn: string;
    type: string;
    nullable: boolean;
    resolve: string;
}) {
    const argName = `${mutationOperation}${modelName}MutationArgs`;
    let objectType = null;
    let objectTypeImport = null;
    let isBatch = false;
    if (batchMutationOperations.includes(mutationOperation)) {
        objectType = `MutationObject<typeof BatchPayload, typeof ${argName}>;`;
        objectTypeImport = "MutationObject";
        isBatch = true;
    } else {
        objectType = `MutationPrismaObject<typeof ${argName}, "${modelName}">`;
        objectTypeImport = "MutationPrismaObject";
    }

    return `import * as Inputs from '../../inputs.js';
import { ${objectTypeImport} } from "../../utils.js";${isBatch ? '\nimport { BatchPayload } from "../../objects.js";' : ""}
import { builder } from '${builderImportPath}';

export const ${argName} = builder.args((t) => (${argsReturn}))

export const ${mutationOperation}${modelName}MutationObject = {
  type: ${type},
  nullable: ${nullable},
  args: ${mutationOperation}${modelName}MutationArgs,
  resolve: ${resolve},
} satisfies ${objectType};
`;
}

function makeCreateManyArgsTemplate({ modelName }: { modelName: string }) {
    return `{ data: t.field({ type: [Inputs.${modelName}CreateManyInput], required: true }) }`;
}
function makeCreateOneArgsTemplate({ modelName }: { modelName: string }) {
    return `{ data: t.field({ type: Inputs.${modelName}CreateInput, required: true }) }`;
}
function makeDeleteManyArgsTemplate({ modelName }: { modelName: string }) {
    return `{ where: t.field({ type: Inputs.${modelName}WhereInput, required: true }) }`;
}
function makeDeleteOneArgsTemplate({ modelName }: { modelName: string }) {
    return `{ where: t.field({ type: Inputs.${modelName}WhereUniqueInput, required: true }) }`;
}
function makeUpdateManyArgsTemplate({ modelName }: { modelName: string }) {
    return `{
      where: t.field({ type: Inputs.${modelName}WhereInput, required: false }),
      data: t.field({ type: Inputs.${modelName}UpdateManyMutationInput, required: true }),
    }`;
}
function makeUpdateOneArgsTemplate({ modelName }: { modelName: string }) {
    return `{
      where: t.field({ type: Inputs.${modelName}WhereUniqueInput, required: true }),
      data: t.field({ type: Inputs.${modelName}UpdateInput, required: true }),
    }`;
}
function makeUpsertOneArgsTemplate({ modelName }: { modelName: string }) {
    return `{
      where: t.field({ type: Inputs.${modelName}WhereUniqueInput, required: true }),
      create: t.field({ type: Inputs.${modelName}CreateInput, required: true }),
      update: t.field({ type: Inputs.${modelName}UpdateInput, required: true }),
    }`;
}

function makeCreateManyResolverTemplate({ prismaCaller, modelName }: { prismaCaller: string; modelName: string }) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (query, _root, args, context, _info) =>
      await ${prismaCaller}.${modelNameLower}.createManyAndReturn({ data: args.data, select: query.select })`;
}
function makeCreateOneResolverTemplate({ prismaCaller, modelName }: { prismaCaller: string; modelName: string }) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (query, _root, args, context, _info) =>
      await ${prismaCaller}.${modelNameLower}.create({ data: args.data, ...query })`;
}

function makeDeleteManyResolverTemplate({ prismaCaller, modelName }: { prismaCaller: string; modelName: string }) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (_root, args, context, _info) =>
      await ${prismaCaller}.${modelNameLower}.deleteMany({ where: args.where })`;
}
function makeDeleteOneResolverTemplate({ prismaCaller, modelName }: { prismaCaller: string; modelName: string }) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (query, _root, args, context, _info) =>
      await ${prismaCaller}.${modelNameLower}.delete({ where: args.where, ...query })`;
}
function makeUpdateManyResolverTemplate({ prismaCaller, modelName }: { prismaCaller: string; modelName: string }) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (_root, args, context, _info) =>
      await ${prismaCaller}.${modelNameLower}.updateMany({ where: args.where || undefined, data: args.data })`;
}
function makeUpdateOneResolverTemplate({ prismaCaller, modelName }: { prismaCaller: string; modelName: string }) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (query, _root, args, context, _info) =>
      await ${prismaCaller}.${modelNameLower}.update({ where: args.where, data: args.data, ...query })`;
}
function makeUpsertOneResolverTemplate({ prismaCaller, modelName }: { prismaCaller: string; modelName: string }) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (query, _root, args, context, _info) =>
      await ${prismaCaller}.${modelNameLower}.upsert({
        where: args.where,
        create: args.create,
        update: args.update,
        ...query,
      })`;
}

export function makeCreateMany({ config, modelName }: { config: ConfigInternal; modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "createMany",
        modelName: modelName,
        builderImportPath: config.global.builderImportPath,
        argsReturn: makeCreateManyArgsTemplate({ modelName }),
        type: `["${modelName}"]`,
        nullable: false,
        resolve: makeCreateManyResolverTemplate({
            prismaCaller: config.crud.prismaCaller,
            modelName: modelName,
        }),
    });
}
export function makeCreateOne({ config, modelName }: { config: ConfigInternal; modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "createOne",
        modelName: modelName,
        builderImportPath: config.global.builderImportPath,
        argsReturn: makeCreateOneArgsTemplate({ modelName }),
        type: `"${modelName}"`,
        nullable: false,
        resolve: makeCreateOneResolverTemplate({
            prismaCaller: config.crud.prismaCaller,
            modelName: modelName,
        }),
    });
}
export function makeDeleteMany({ config, modelName }: { config: ConfigInternal; modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "deleteMany",
        modelName: modelName,
        builderImportPath: config.global.builderImportPath,
        argsReturn: makeDeleteManyArgsTemplate({ modelName }),
        type: "BatchPayload",
        nullable: true,
        resolve: makeDeleteManyResolverTemplate({
            prismaCaller: config.crud.prismaCaller,
            modelName: modelName,
        }),
    });
}
export function makeDeleteOne({ config, modelName }: { config: ConfigInternal; modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "deleteOne",
        modelName: modelName,
        builderImportPath: config.global.builderImportPath,
        argsReturn: makeDeleteOneArgsTemplate({ modelName }),
        type: `"${modelName}"`,
        nullable: true,
        resolve: makeDeleteOneResolverTemplate({
            prismaCaller: config.crud.prismaCaller,
            modelName: modelName,
        }),
    });
}
export function makeUpdateMany({ config, modelName }: { config: ConfigInternal; modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "updateMany",
        modelName: modelName,
        builderImportPath: config.global.builderImportPath,
        argsReturn: makeUpdateManyArgsTemplate({ modelName }),
        type: "BatchPayload",
        nullable: false,
        resolve: makeUpdateManyResolverTemplate({
            prismaCaller: config.crud.prismaCaller,
            modelName: modelName,
        }),
    });
}
export function makeUpdateOne({ config, modelName }: { config: ConfigInternal; modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "updateOne",
        modelName: modelName,
        builderImportPath: config.global.builderImportPath,
        argsReturn: makeUpdateOneArgsTemplate({ modelName }),
        type: `"${modelName}"`,
        nullable: true,
        resolve: makeUpdateOneResolverTemplate({
            prismaCaller: config.crud.prismaCaller,
            modelName: modelName,
        }),
    });
}
export function makeUpsertOne({ config, modelName }: { config: ConfigInternal; modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "upsertOne",
        modelName: modelName,
        builderImportPath: config.global.builderImportPath,
        argsReturn: makeUpsertOneArgsTemplate({ modelName }),
        type: `"${modelName}"`,
        nullable: false,
        resolve: makeUpsertOneResolverTemplate({
            prismaCaller: config.crud.prismaCaller,
            modelName: modelName,
        }),
    });
}
