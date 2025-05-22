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

function makeMutationTemplate({
    mutationOperation,
    modelName,
    argsReturn,
    type,
    nullable,
    resolve,
}: {
    mutationOperation: MutationOperation;
    modelName: string;
    argsReturn: string;
    type: string;
    nullable: boolean;
    resolve: string;
}) {
    return `import * as Inputs from '../../inputs';
import { builder } from '../../../builder';

export const ${mutationOperation}${modelName}MutationArgs = builder.args((t) => (${argsReturn}))

export const ${mutationOperation}${modelName}MutationObject: MutationPrismaObject = {
  type: ${type},
  nullable: ${nullable},
  args: ${mutationOperation}${modelName}MutationArgs,
  resolve: ${resolve},
};
`;
}

function makeCreateManyArgsTemplate({ modelName }: { modelName: string }) {
    return `{ data: t.field({ type: [Inputs.${modelName}CreateInput], required: true }) }`;
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

function makeCreateManyResolverTemplate({
    prismaCaller,
    modelName,
}: {
    prismaCaller: string;
    modelName: string;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (_mutation, _root, args, _context, _info) =>
      await ${prismaCaller}.$transaction(args.data.map((data) => ${prismaCaller}.${modelNameLower}.create({ data })))`;
}
function makeCreateOneResolverTemplate({
    prismaCaller,
    modelName,
}: {
    prismaCaller: string;
    modelName: string;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (mutation, _root, args, _context, _info) =>
      await ${prismaCaller}.${modelNameLower}.create({ data: args.data, ...mutation })`;
}

function makeDeleteManyResolverTemplate({
    prismaCaller,
    modelName,
}: {
    prismaCaller: string;
    modelName: string;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (_root, args, _context, _info) =>
      await ${prismaCaller}.${modelNameLower}.deleteMany({ where: args.where })`;
}
function makeDeleteOneResolverTemplate({
    prismaCaller,
    modelName,
}: {
    prismaCaller: string;
    modelName: string;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (mutation, _root, args, _context, _info) =>
      await ${prismaCaller}.${modelNameLower}.delete({ where: args.where, ...mutation })`;
}
function makeUpdateManyResolverTemplate({
    prismaCaller,
    modelName,
}: {
    prismaCaller: string;
    modelName: string;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (_root, args, _context, _info) =>
      await ${prismaCaller}.${modelNameLower}.updateMany({ where: args.where || undefined, data: args.data })`;
}
function makeUpdateOneResolverTemplate({
    prismaCaller,
    modelName,
}: {
    prismaCaller: string;
    modelName: string;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (mutation, _root, args, _context, _info) =>
      await ${prismaCaller}.${modelNameLower}.update({ where: args.where, data: args.data, ...mutation })`;
}
function makeUpsertOneResolverTemplate({
    prismaCaller,
    modelName,
}: {
    prismaCaller: string;
    modelName: string;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);
    return `async (mutation, _root, args, _context, _info) =>
      await ${prismaCaller}.${modelNameLower}.upsert({
        where: args.where,
        create: args.create,
        update: args.update,
        ...mutation,
      })`;
}

export function makeCreateMany({ modelName }: { modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "createMany",
        modelName: modelName,
        argsReturn: makeCreateManyArgsTemplate({ modelName }),
        type: "['${modelName}']",
        nullable: false,
        resolve: makeCreateManyResolverTemplate({
            prismaCaller: "prisma",
            modelName: modelName,
        }),
    });
}
export function makeCreateOne({ modelName }: { modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "createOne",
        modelName: modelName,
        argsReturn: makeCreateOneArgsTemplate({ modelName }),
        type: "'${modelName}'",
        nullable: false,
        resolve: makeCreateOneResolverTemplate({
            prismaCaller: "prisma",
            modelName: modelName,
        }),
    });
}
export function makeDeleteMany({ modelName }: { modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "deleteMany",
        modelName: modelName,
        argsReturn: makeDeleteManyArgsTemplate({ modelName }),
        type: "BatchPayload",
        nullable: true,
        resolve: makeDeleteManyResolverTemplate({
            prismaCaller: "prisma",
            modelName: modelName,
        }),
    });
}
export function makeDeleteOne({ modelName }: { modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "deleteOne",
        modelName: modelName,
        argsReturn: makeDeleteOneArgsTemplate({ modelName }),
        type: "'${modelName}'",
        nullable: true,
        resolve: makeDeleteOneResolverTemplate({
            prismaCaller: "prisma",
            modelName: modelName,
        }),
    });
}
export function makeUpdateMany({ modelName }: { modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "updateMany",
        modelName: modelName,
        argsReturn: makeUpdateManyArgsTemplate({ modelName }),
        type: "BatchPayload",
        nullable: false,
        resolve: makeUpdateManyResolverTemplate({
            prismaCaller: "prisma",
            modelName: modelName,
        }),
    });
}
export function makeUpdateOne({ modelName }: { modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "updateOne",
        modelName: modelName,
        argsReturn: makeUpdateOneArgsTemplate({ modelName }),
        type: "'${modelName}'",
        nullable: true,
        resolve: makeUpdateOneResolverTemplate({
            prismaCaller: "prisma",
            modelName: modelName,
        }),
    });
}
export function makeUpsertOne({ modelName }: { modelName: string }) {
    return makeMutationTemplate({
        mutationOperation: "upsertOne",
        modelName: modelName,
        argsReturn: makeUpsertOneArgsTemplate({ modelName }),
        type: "'${modelName}'",
        nullable: false,
        resolve: makeUpsertOneResolverTemplate({
            prismaCaller: "prisma",
            modelName: modelName,
        }),
    });
}
