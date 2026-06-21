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
import path from "node:path";
import { ConfigInternal } from "utils/config.js";
import { debugLog, writePothosFile } from "utils/filesystem.js";
import { makeObjectTemplate } from "../templates/object.js";
import { getObjectFieldsString } from "./objectFields.js";

type ResolverType = "queries" | "mutations";

type AllOperation =
    | (typeof queryOperationNames)[number]
    | (typeof mutationOperationNames)[number];

/** Map a CRUD operation name to its generated resolver source. */
function generateResolver({
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

const getResolverTypeName = (type: ResolverType) => {
    return type === "mutations" ? "Mutation" : "Query";
};

export type GeneratedResolver = {
    resolverName: string;
    modelName: string;
    type: ResolverType;
};

/** Write index.ts */
export async function writeIndex({ config, model }: { config: ConfigInternal; model: DMMF.Model }) {
    const outputPath = path.join(config.global.outputDir, model.name, "index.ts");
    await writePothosFile({
        content: `export * from "./mutations";
export * from "./object.base";
export * from "./queries";`,
        destination: outputPath,
    });
}

/** Write object.base.ts */
export async function writeObject(config: ConfigInternal, model: DMMF.Model): Promise<void> {
    // Fields
    const { fields } = getObjectFieldsString({
        modelName: model.name,
        dmmfFields: model.fields,
    });

    const fileLocation = path.join(config.global.outputDir, model.name, "object.base.ts");

    // Write output
    await writePothosFile({
        content: makeObjectTemplate({
            config: config,
            modelName: model.name,
            fields: fields.join("\n"),
        }),
        destination: fileLocation,
    });
}

function isExcludedResolver(options: ConfigInternal, name: string) {
    const { excludeResolversContain, excludeResolversExact, includeResolversContain, includeResolversExact } =
        options.crud || {};
    if (includeResolversExact.length) {
        return !includeResolversExact.includes(name);
    }
    if (includeResolversContain.length) {
        return !includeResolversContain.some((include) => name.includes(include));
    }

    if (excludeResolversExact.length && excludeResolversExact.includes(name)) {
        return true;
    }
    if (excludeResolversContain.length && excludeResolversContain.some((r) => name.includes(r))) {
        return true;
    }
    return false;
}

/** Write resolvers (e.g. findFirst, findUnique, createOne, etc) */
export async function writeResolvers({
    config,
    model,
    type,
}: {
    config: ConfigInternal;
    model: DMMF.Model;
    type: ResolverType;
}): Promise<GeneratedResolver[]> {
    const resolverOperations = type === "mutations" ? mutationOperationNames : queryOperationNames;
    const resolvers = resolverOperations.filter(
        (operationName) => !isExcludedResolver(config, `${operationName}${model.name}`)
    );

    // Generate files
    await Promise.all(
        resolvers.map((operationName) => {
            const fileLocation = path.join(config.global.outputDir, model.name, type, `${operationName}.base.ts`);

            const resloverContent = generateResolver({
                config: config,
                operationName: operationName,
                modelName: model.name,
            });
            if (resloverContent === null) {
                debugLog(`Skipping resolver ${operationName}${model.name}`);
                return;
            }

            return writePothosFile({
                content: resloverContent,
                destination: fileLocation,
            });
        })
    );

    if (resolvers.length) {
        const mutationExports = mutationOperationNames.map((mutation) => `export * from "./${mutation}.base";`);
        const queryExports = queryOperationNames.map((query) => `export * from "./${query}.base";`);
        await writePothosFile({
            content: queryExports.join("\n") + "\n",
            destination: path.join(config.global.outputDir, model.name, "queries", "index.ts"),
        });
        await writePothosFile({
            content: mutationExports.join("\n") + "\n",
            destination: path.join(config.global.outputDir, model.name, "mutations", "index.ts"),
        });
    }

    return resolvers.map((resolverName) => ({
        resolverName,
        modelName: model.name,
        type,
    }));
}
