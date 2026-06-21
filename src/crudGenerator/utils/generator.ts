import type { DMMF } from "@prisma/generator-helper";
import { ConfigInternal } from "utils/config.js";
import { GeneratedResolver, writeIndex, writeObject, writeResolvers } from "./parts";

export async function generateModel(
    config: ConfigInternal,
    dmmf: DMMF.Document,
    modelName: string
): Promise<{
    resolvers: GeneratedResolver[];
    index: Awaited<ReturnType<typeof writeIndex>>;
}> {
    const model = dmmf.datamodel.models.find((m) => m.name === modelName);
    if (!model) return { index: undefined, resolvers: [] };

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
