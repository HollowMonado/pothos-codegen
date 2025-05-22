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
import {
    GeneratedResolver,
    writeIndex,
    writeObject,
    writeResolvers,
} from "./parts";

export const allOperationNames = [
    ...queryOperationNames,
    ...mutationOperationNames,
] as const;
export type AllOperation = (typeof allOperationNames)[number];

export function generateResolver({
    operationName,
    modelName,
}: {
    operationName: AllOperation;
    modelName: string;
}) {
    switch (operationName) {
        case "findFirst":
            return makeFindFirst({ modelName });
        case "findMany":
            return makeFindMany({ modelName });
        case "count":
            return makeCount({ modelName });
        case "findUnique":
            return makeFindUnique({ modelName });
        case "createMany":
            return makeCreateMany({ modelName });
        case "createOne":
            return makeCreateOne({ modelName });
        case "deleteMany":
            return makeDeleteMany({ modelName });
        case "deleteOne":
            return makeDeleteOne({ modelName });
        case "updateMany":
            return makeUpdateMany({ modelName });
        case "updateOne":
            return makeUpdateOne({ modelName });
        case "upsertOne":
            return makeUpsertOne({ modelName });
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
    const mutations = await writeResolvers(config, model, "mutations");
    const index = await writeIndex(config, model, { queries, mutations });

    return { resolvers: [...queries, ...mutations], index };
}
