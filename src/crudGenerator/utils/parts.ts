import type { DMMF } from "@prisma/generator-helper";
import path from "node:path";
import { ConfigInternal } from "utils/config.js";
import { debugLog, writePothosFile } from "utils/filesystem.js";
import { makeObjectTemplate } from "../templates/object.js";
import { allOperationNames, generateResolver } from "./generator.js";
import { getObjectFieldsString } from "./objectFields.js";

type ResolverType = "queries" | "mutations";

const getResolverTypeName = (type: ResolverType) => {
    return type === "mutations" ? "Mutation" : "Query";
};

export type GeneratedResolver = {
    resolverName: string;
    modelName: string;
    type: ResolverType;
};

/** Write index.ts */
export async function writeIndex(config: ConfigInternal, model: DMMF.Model) {
    const outputPath = path.join(config.crud.outputDir, model.name, "index.ts");
    await writePothosFile({
        content: `export * from "./mutations";
export * from "./object.base";
export * from "./queries";`,
        destination: outputPath,
    });
}

/** Write object.base.ts */
export async function writeObject(
    config: ConfigInternal,
    model: DMMF.Model
): Promise<void> {
    // Fields
    const { fields } = getObjectFieldsString({
        modelName: model.name,
        dmmfFields: model.fields,
    });

    const fileLocation = path.join(
        config.crud.outputDir,
        model.name,
        "object.base.ts"
    );

    // Write output
    await writePothosFile({
        content: makeObjectTemplate({
            modelName: model.name,
            fields: fields.join("\n"),
        }),
        destination: fileLocation,
    });
}

function isExcludedResolver(options: ConfigInternal, name: string) {
    const {
        excludeResolversContain,
        excludeResolversExact,
        includeResolversContain,
        includeResolversExact,
    } = options.crud || {};
    if (includeResolversExact.length) {
        return !includeResolversExact.includes(name);
    }
    if (includeResolversContain.length) {
        return !includeResolversContain.some((include) =>
            name.includes(include)
        );
    }

    if (excludeResolversExact.length && excludeResolversExact.includes(name)) {
        return true;
    }
    if (
        excludeResolversContain.length &&
        excludeResolversContain.some((r) => name.includes(r))
    ) {
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
    const resolvers = allOperationNames.filter(
        (operationName) =>
            !isExcludedResolver(config, `${operationName}${model.name}`)
    );

    // Generate files
    await Promise.all(
        resolvers.map((operationName) => {
            const fileLocation = path.join(
                config.crud.outputDir,
                model.name,
                type,
                `${operationName}.base.ts`
            );

            const resloverContent = generateResolver({
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

    if (resolvers.length)
        await writePothosFile({
            content:
                resolvers
                    .map(
                        ([name]) =>
                            `export ${(() => {
                                return `{ ${name}${model.name}${type === "mutations" ? "Mutation" : "Query"}, ${name}${
                                    model.name
                                }${getResolverTypeName(type)}Object }`;
                            })()} from './${name}.base';`
                    )
                    .join("\n") + "\n",
            destination: path.join(
                config.crud.outputDir,
                model.name,
                type,
                "index.ts"
            ),
        });

    return resolvers.map(([resolverName]) => ({
        resolverName,
        modelName: model.name,
        type,
    }));
}
