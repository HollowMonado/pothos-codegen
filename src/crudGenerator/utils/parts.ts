import type { DMMF } from "@prisma/generator-helper";
import path from "node:path";
import { ConfigInternal } from "utils/config.js";
import { getConfigCrudUnderscore } from "utils/configUtils.js";
import { debugLog, writePothosFile } from "utils/filesystem.js";
import { useTemplate } from "utils/template.js";
import {
    escapeQuotesAndMultilineSupport,
    firstLetterUpperCase,
    getCompositeName,
} from "../../utils/string";
import { objectTemplate } from "../templates/object.js";
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
export async function writeIndex(
    config: ConfigInternal,
    model: DMMF.Model,
    {
        queries,
        mutations,
    }: { queries: GeneratedResolver[]; mutations: GeneratedResolver[] }
) {
    const queriesExports = queries.map(
        (el) =>
            `${el.resolverName}${el.modelName}${getResolverTypeName(el.type)}`
    );
    const mutationsExports = mutations.map(
        (el) =>
            `${el.resolverName}${el.modelName}${getResolverTypeName(el.type)}`
    );
    const optionalUnderscore = getConfigCrudUnderscore(config);

    const exportsWithName = [
        {
            name: "./object.base",
            exports: [
                `${model.name}${optionalUnderscore}Object`,
                ...model.fields.map(
                    (el) =>
                        `${model.name}${optionalUnderscore}${firstLetterUpperCase(el.name)}${optionalUnderscore}FieldObject`
                ),
            ],
        },
        {
            name: "./mutations",
            exports: [
                ...mutationsExports,
                ...mutationsExports.map((el) => `${el}Object`),
            ],
        },
        {
            name: "./queries",
            exports: [
                ...queriesExports,
                ...queriesExports.map((el) => `${el}Object`),
            ],
        },
    ];

    // TODO Refactor this logic + tests
    const exports = exportsWithName
        .filter((el) => el.exports.length)
        .map(
            (el) =>
                `export {\n  ${el.exports.join(",\n  ")}\n} from '${el.name}';`
        );
    const outputPath = path.join(config.crud.outputDir, model.name, "index.ts");
    const content = exports.join("\n") + "\n";
    await writePothosFile(config, "crud.model.index", content, outputPath);
    return exportsWithName;
}

/** Write object.base.ts */
export async function writeObject(
    config: ConfigInternal,
    model: DMMF.Model
): Promise<void> {
    // findUnique
    const idField = model.fields.find((f) => f.isId);
    let findUnique = `(fields) => ({ ...fields })`;
    if (idField) findUnique = `({ ${idField.name} }) => ({ ${idField.name} })`;
    if (model.primaryKey?.fields)
        findUnique = `(fields) => ({ ${model.primaryKey.name || getCompositeName(model.primaryKey.fields)}: fields })`;

    // Fields
    const { fields, exportFields } = getObjectFieldsString(
        model.name,
        model.fields,
        config
    );

    const fileLocation = path.join(
        config.crud.outputDir,
        model.name,
        "object.base.ts"
    );
    const builderCalculatedImport = getBuilderCalculatedImport({
        config,
        fileLocation,
    });

    // Write output
    await writePothosFile(
        config,
        "crud.model.object",
        useTemplate(objectTemplate, {
            modelName: model.name,
            description:
                escapeQuotesAndMultilineSupport(model.documentation) ||
                "undefined", // Object description defined in schema.prisma
            findUnique,
            inputsImporter: config.crud.inputsImporter,
            fields: fields.join("\n    "),
            exportFields: exportFields.join("\n\n"),
            builderCalculatedImport,
            optionalUnderscore: getConfigCrudUnderscore(config),
        }),
        fileLocation
    );
}

const isExcludedResolver = (options: ConfigInternal, name: string) => {
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
};

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
