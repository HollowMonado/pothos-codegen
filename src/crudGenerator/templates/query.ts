import { firstLetterLowerCase } from "utils/string.js";

export const queryOperationNames = [
    "findFirst",
    "findMany",
    "count",
    "findUnique",
] as const;
export type QueryOperation = (typeof queryOperationNames)[number];

function makeQueryTemplate({
    queryOperation,
    modelName,
    argsReturn,
    type,
    nullable,
    resolve,
}: {
    queryOperation: QueryOperation;
    modelName: string;
    argsReturn: string;
    type: string;
    nullable: boolean;
    resolve: string;
}) {
    return `import * as Inputs from '../../inputs';
import { builder } from '../../../builder';

export const ${queryOperation}${modelName}QueryArgs = builder.args((t) => (${argsReturn}))

export const ${queryOperation}${modelName}QueryObject: QueryPrismaObject = {
  type: ${type},
  nullable: ${nullable},
  args: ${queryOperation}${modelName}QueryArgs,
  resolve: ${resolve},
};
`;
}

function makeQueryArgsTemplate({ modelName }: { modelName: string }) {
    return `{
  where: t.field({ type: Inputs.${modelName}WhereInput, required: false }),
  orderBy: t.field({ type: [Inputs.${modelName}OrderByWithRelationInput], required: false }),
  cursor: t.field({ type: Inputs.${modelName}WhereUniqueInput, required: false }),
  take: t.field({ type: 'Int', required: false }),
  skip: t.field({ type: 'Int', required: false }),
  distinct: t.field({ type: [Inputs.${modelName}ScalarFieldEnum], required: false }),
}`;
}

function makeQueryResloverTemplate({
    prismaCaller,
    isPrisma,
    modelName,
    operation,
    hasDistinct,
}: {
    prismaCaller: string;
    isPrisma: boolean;
    modelName: string;
    operation: QueryOperation;
    hasDistinct: boolean;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);

    const queryArg = isPrisma ? "query" : "";
    const query = isPrisma ? "\n...query" : "";

    return `async (${queryArg}_root, args, _context, _info) =>
      await ${prismaCaller}.${modelNameLower}.${operation}({
        where: args.where || undefined,
        cursor: args.cursor || undefined,
        take: args.take || undefined,${hasDistinct ? "distinct: args.distinct || undefined," : ""}
        skip: args.skip || undefined,
        orderBy: args.orderBy || undefined,${query}
      })`;
}

function makeFindUniqueArgsTemplate({ modelName }: { modelName: string }) {
    return `{ where: t.field({ type: Inputs.${modelName}WhereUniqueInput, required: true }) }`;
}

function makeFindUniqueResloverTemplate({
    prismaCaller,
    modelName,
}: {
    prismaCaller: string;
    modelName: string;
}) {
    const modelNameLower = firstLetterLowerCase(modelName);

    return `async (query, _root, args, _context, _info) =>
      await ${prismaCaller}.${modelNameLower}.findUnique({ where: args.where, ...query })`;
}

export function makeFindFirst({ modelName }: { modelName: string }) {
    return makeQueryTemplate({
        queryOperation: "findFirst",
        modelName: modelName,
        argsReturn: makeQueryArgsTemplate({ modelName }),
        type: "'#{modelName}'",
        nullable: false,
        resolve: makeQueryResloverTemplate({
            prismaCaller: "prisma",
            isPrisma: true,
            modelName,
            operation: "findFirst",
            hasDistinct: true,
        }),
    });
}

export function makeFindMany({ modelName }: { modelName: string }) {
    return makeQueryTemplate({
        queryOperation: "findMany",
        modelName: modelName,
        argsReturn: makeQueryArgsTemplate({ modelName }),
        type: "['#{modelName}']",
        nullable: true,
        resolve: makeQueryResloverTemplate({
            prismaCaller: "prisma",
            isPrisma: true,
            modelName,
            operation: "findMany",
            hasDistinct: true,
        }),
    });
}

export function makeFindUnique({ modelName }: { modelName: string }) {
    return makeQueryTemplate({
        queryOperation: "findUnique",
        modelName: modelName,
        argsReturn: makeFindUniqueArgsTemplate({ modelName }),
        type: "'#{modelName}'",
        nullable: true,
        resolve: makeFindUniqueResloverTemplate({
            prismaCaller: "prisma",
            modelName: modelName,
        }),
    });
}

export function makeCount({ modelName }: { modelName: string }) {
    return makeQueryTemplate({
        queryOperation: "count",
        modelName: modelName,
        argsReturn: makeQueryArgsTemplate({ modelName }),
        type: "'Int'",
        nullable: false,
        resolve: makeQueryResloverTemplate({
            prismaCaller: "prisma",
            isPrisma: false,
            modelName,
            operation: "count",
            hasDistinct: false,
        }),
    });
}

export const queries = {
    makeFindFirst,
    makeFindMany,
    makeCount,
    makeFindUnique,
};
