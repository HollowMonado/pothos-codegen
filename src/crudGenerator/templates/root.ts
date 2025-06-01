export function makeObjectsFileTemplate({
    prismaImporter,
    builderImportPath,
    modelNames,
}: {
    prismaImporter: string;
    builderImportPath: string;
    modelNames: string;
}) {
    return `${prismaImporter}
import { builder } from "${builderImportPath}";

export const BatchPayload = builder.objectType(builder.objectRef<Prisma.BatchPayload>('BatchPayload'), {
  description: 'Batch payloads from prisma.',
  fields: (t) => ({
    count: t.exposeInt('count', { description: 'Prisma Batch Payload', nullable: false }),
  }),
});

export const modelNames = [
  ${modelNames}
] as const;

export type Model = typeof modelNames[number];
`;
}

export function makeUtilsTemplate({ builderImport }: { builderImport: string }) {
    return `import {builder} from "${builderImport}";
import {
    FieldKind,
    FieldNullability,
    FieldOptionsFromKind,
    InputFieldMap,
    InterfaceParam,
    ObjectRef,
    TypeParam,
} from "@pothos/core";
import { PrismaFieldOptions, PrismaModelTypes, PrismaObjectTypeOptions } from "@pothos/plugin-prisma";

type Types = typeof builder extends PothosSchemaTypes.SchemaBuilder<infer T> ? T : unknown;

export type PrismaObject<ModelName extends keyof PothosBuilderTypes["PrismaTypes"]> = PrismaObjectTypeOptions<
    Types,
    Types["PrismaTypes"][ModelName],
    InterfaceParam<Types>[],
    unknown,
    unknown,
    Types["PrismaTypes"][ModelName]["Shape"]
>;

type PothosBuilderTypes = typeof builder extends PothosSchemaTypes.SchemaBuilder<infer T> ? T : unknown;
type PrismaModels = keyof PothosBuilderTypes["PrismaTypes"] | [keyof PothosBuilderTypes["PrismaTypes"]];

type GeneralObject<
    OperationKind extends FieldKind,
    Type extends TypeParam<PothosBuilderTypes>,
    ArgsType extends InputFieldMap,
> = FieldOptionsFromKind<
    PothosBuilderTypes,
    PothosBuilderTypes["Root"],
    Type,
    FieldNullability<PothosBuilderTypes>,
    ArgsType,
    OperationKind,
    PothosBuilderTypes,
    unknown
>;

export type QueryObject<Type extends TypeParam<PothosBuilderTypes>, ArgsType extends InputFieldMap> = GeneralObject<
    "Query",
    Type,
    ArgsType
>;
export type MutationObject<Type extends TypeParam<PothosBuilderTypes>, ArgsType extends InputFieldMap> = GeneralObject<
    "Mutation",
    Type,
    ArgsType
>;

type GeneralPrismaObject<
    OperationKind extends FieldKind,
    ArgsTypes extends InputFieldMap,
    ModelName extends keyof PothosBuilderTypes["PrismaTypes"],
> = {
    type: PrismaModels;
    nullable: boolean;
    args: ArgsTypes;
    resolve: PrismaFieldOptions<
        PothosBuilderTypes,
        PothosBuilderTypes["Root"],
        PrismaModels,
        PothosBuilderTypes["PrismaTypes"][ModelName],
        PrismaModels extends [unknown]
            ? [ObjectRef<PothosBuilderTypes, PrismaModelTypes["Shape"]>]
            : ObjectRef<PothosBuilderTypes, PrismaModelTypes["Shape"]>,
        ArgsTypes,
        boolean,
        unknown,
        unknown,
        OperationKind
    >["resolve"];
};

export type QueryPrismaObject<
    ArgsType extends InputFieldMap,
    ModelName extends keyof PothosBuilderTypes["PrismaTypes"],
> = GeneralPrismaObject<"Query", ArgsType, ModelName>;
export type MutationPrismaObject<
    ArgsType extends InputFieldMap,
    ModelName extends keyof PothosBuilderTypes["PrismaTypes"],
> = GeneralPrismaObject<"Mutation", ArgsType, ModelName>;
`;
}

export function makeAutoCrudFileTemplate({
    imports,
    builderImportPath,
    modelsGenerated,
}: {
    imports: string;
    builderImportPath: string;
    modelsGenerated: string;
}) {
    //TODO: remove any
    return `${imports}
import { builder } from "${builderImportPath}";
import * as Objects from './objects';

type Model = Objects.Model;

export const Cruds: Record<
  Objects.Model,
  {
    Object: Record<string, any>;
    queries: Record<string, Record<string, any>>;
    mutations: Record<string, Record<string, any>>;
  }
> = {
${modelsGenerated}
};


const crudEntries = Object.entries(Cruds);

type ResolverType = "Query" | "Mutation";
function generateResolversByType(type: ResolverType, opts?: CrudOptions) {
    return crudEntries.flatMap(([modelName, config]) => {
        const resolverEntries = Object.entries(config[type === "Query" ? "queries" : "mutations"]);

        return resolverEntries
            .filter(([operationName]) => {
                const model = modelName as Model;
                const operation = operationName as SingleOperationType;
                return includeOperation({ model, operation, opts });
            })
            .map(([operationName, resolverObjectDefiner]) => {
                const resolverName = operationName + modelName;
                const isntPrismaFieldList = ["count", "deleteMany", "updateMany"];
                const isPrismaField = !isntPrismaFieldList.includes(operationName);

                const getFields = (t: any) => {
                    const field = resolverObjectDefiner;
                    const handledField = opts?.handleResolver
                        ? opts.handleResolver({
                              field,
                              modelName: modelName as Model,
                              operationName,
                              resolverName,
                              t,
                              isPrismaField,
                              type,
                          })
                        : field;

                    return {
                        [resolverName]: isPrismaField ? t.prismaField(handledField) : t.field(handledField),
                    };
                };

                return type === "Query"
                    ? [builder.queryFields((t) => getFields(t))]
                    : [builder.mutationFields((t) => getFields(t))];
            });
    });
}

export function generateAllObjects(opts?: CrudOptions) {
    return crudEntries
        .filter(([md]) => includeModel({ model: md as Model, opts }))
        .map(([modelName, { Object }]) => {
            return builder.prismaObject(modelName as Model, Object); // Objects is all imports
        });
}

export function generateAllQueries(opts?: CrudOptions) {
    generateResolversByType("Query", opts);
}

export function generateAllMutations(opts?: CrudOptions) {
    generateResolversByType("Mutation", opts);
}

export function generateAllResolvers(opts?: CrudOptions) {
    generateResolversByType("Mutation", opts);
    generateResolversByType("Query", opts);
}

export const queryOperationNames = ["findFirst", "findMany", "count", "findUnique"] as const;
export const mutationOperationNames = [
    "createMany",
    "createOne",
    "deleteMany",
    "deleteOne",
    "updateMany",
    "updateOne",
    "upsertOne",
] as const;
export const allOperationNames = [...queryOperationNames, ...mutationOperationNames] as const;
type SingleOperationType = (typeof allOperationNames)[number];

type CrudOptions = {
    includeModel?: Partial<Record<Model, boolean>>;
    excludeModel?: Partial<Record<Model, boolean>>;
    includeOperation?: Partial<Record<Model, SingleOperationType[]>>;
    excludeOperation?: Partial<Record<Model, SingleOperationType[]>>;
    /**
     * Caution: This is not type safe
     * Wrap all queries/mutations to override args, run extra code in resolve function (ie: throw errors, logs), apply plugins, etc.
     */
    handleResolver?: (props: {
        modelName: Model;
        field: any;
        operationName: string;
        resolverName: string;
        t: any;
        isPrismaField: boolean;
        type: ResolverType;
    }) => any;
};

function includeModel({ model, opts }: { model: Model; opts?: CrudOptions }): boolean {
    if (!opts) return true;

    if (opts.includeModel) {
        const isIncluded = opts.includeModel[model] ?? false;
        return isIncluded;
    } else if (opts.excludeModel) {
        const isExcluded = opts.excludeModel[model] ?? true;
        return !isExcluded;
    }

    return true;
}

function includeOperation({
    model,
    operation,
    opts,
}: {
    model: Model;
    operation: SingleOperationType;
    opts?: CrudOptions;
}): boolean {
    if (!opts) return true;

    if (opts.includeOperation) {
        const isIncluded = opts.includeOperation[model]?.includes(operation) ?? false;
        return isIncluded;
    } else if (opts.excludeOperation) {
        const isExcluded = opts.excludeOperation[model]?.includes(operation) ?? true;
        return !isExcluded;
    }

    return true;
}

export function generateAllCrud(opts?: CrudOptions) {
    generateAllObjects(opts);
    generateAllQueries(opts);
    generateAllMutations(opts);
}
`;
}
