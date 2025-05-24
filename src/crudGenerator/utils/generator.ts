import type { DMMF } from "@prisma/generator-helper";
import {
    makeCreateMany,
    makeCreateOne,
    makeDeleteMany,
    makeDeleteOne,
    makeUpdateMany,
    makeUpdateOne,
    makeUpsertOne,
    mutationOperationNames,
} from "crudGenerator/templates/mutation.js";
import {
    makeCount,
    makeFindFirst,
    makeFindMany,
    makeFindUnique,
    queryOperationNames,
} from "crudGenerator/templates/query.js";
import { ConfigInternal } from "utils/config.js";
import { GeneratedResolver, writeIndex, writeObject, writeResolvers } from "./parts";

export const allOperationNames = [...queryOperationNames, ...mutationOperationNames] as const;
export type AllOperation = (typeof allOperationNames)[number];

export function generateResolver({
    config,
    operationName,
    modelName,
}: {
    config: ConfigInternal;
    operationName: AllOperation;
    modelName: string;
}) {
    switch (operationName) {
        case "findFirst":
            return makeFindFirst({ config, modelName });
        case "findMany":
            return makeFindMany({ config, modelName });
        case "count":
            return makeCount({ config, modelName });
        case "findUnique":
            return makeFindUnique({ config, modelName });
        case "createMany":
            return makeCreateMany({ config, modelName });
        case "createOne":
            return makeCreateOne({ config, modelName });
        case "deleteMany":
            return makeDeleteMany({ config, modelName });
        case "deleteOne":
            return makeDeleteOne({ config, modelName });
        case "updateMany":
            return makeUpdateMany({ config, modelName });
        case "updateOne":
            return makeUpdateOne({ config, modelName });
        case "upsertOne":
            return makeUpsertOne({ config, modelName });
        default:
            return null;
    }
}

export async function generateModel(
    config: ConfigInternal,
    dmmf: DMMF.Document,
    modelName: string
): Promise<{
    resolvers: GeneratedResolver[];
    index: Awaited<ReturnType<typeof writeIndex>>;
}> {
    const model = dmmf.datamodel.models.find((m) => m.name === modelName);
    if (!model) return { index: [], resolvers: [] };

    await writeObject(config, model);

    const queries = await writeResolvers({
        config: config,
        model: model,
        type: "queries",
    });
    const mutations = await writeResolvers({
        config,
        model,
        type: "mutations",
    });
    const index = await writeIndex({ config, model });

    return { resolvers: [...queries, ...mutations], index };
}
