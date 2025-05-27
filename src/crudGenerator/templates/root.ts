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
import {
    PrismaFieldOptions,
    PrismaModelTypes,
    PrismaObjectTypeOptions,
    RelatedFieldOptions,
} from "@pothos/plugin-prisma";

type Types = typeof builder extends PothosSchemaTypes.SchemaBuilder<infer T> ? T : unknown;

export const defineFieldObject = <
    Name extends keyof Types["PrismaTypes"],
    Type extends TypeParam<Types>,
    Nullable extends boolean,
    Args extends InputFieldMap,
>(
    _: Name,
    obj: FieldOptionsFromKind<
        Types,
        Types["PrismaTypes"][Name]["Shape"],
        Type,
        Nullable,
        Args,
        "Object",
        unknown,
        unknown
    >
) => obj as { type: Type; nullable: Nullable; description?: string; resolve: (typeof obj)["resolve"] };

export const defineRelationObject = <
    ModelName extends keyof Types["PrismaTypes"],
    RelationName extends keyof Types["PrismaTypes"][ModelName]["Relations"],
    Nullable extends boolean,
    Args extends InputFieldMap,
>(
    _: ModelName,
    __: RelationName,
    obj: RelatedFieldOptions<
        Types,
        Types["PrismaTypes"][ModelName],
        RelationName,
        Nullable,
        Args,
        unknown,
        Types["PrismaTypes"][ModelName]["Shape"]
    >
) =>
    obj as {
        description: string | undefined;
        nullable: Nullable;
        args: Args;
        query: (typeof obj)["query"];
    };

export const defineRelationFunction = <ModelName extends keyof Types["PrismaTypes"], O>(
    _: ModelName,
    func: (
        t: PothosSchemaTypes.PrismaObjectFieldBuilder<
            Types,
            Types["PrismaTypes"][ModelName],
            Types["PrismaTypes"][ModelName]["Shape"]
        >
    ) => O
) => func;

export const definePrismaObject = <
    Name extends keyof Types["PrismaTypes"],
    Obj extends PrismaObjectTypeOptions<
        Types,
        Types["PrismaTypes"][Name],
        InterfaceParam<Types>[],
        unknown,
        unknown,
        Types["PrismaTypes"][Name]["Shape"]
    >,
>(
    _: Name,
    obj: Obj
) => obj;

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

// TODO: Refactor getParams to link model with object base, and remove any
/**
  User: {
    Object: User.UserObject,
    queries: {},
    mutations: {},
  },
  Post: {
    Object: Post.PostObject,
    queries: {
      findFirst: Post.findFirstPostQuery,
      count: Post.countPostQuery,
    },
    mutations: {
      createOne: Post.createOnePostMutation,
    },
  },
 */

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
    Object: any;
    queries: Record<string, Function>;
    mutations: Record<string, Function>;
  }
> = {
${modelsGenerated}
};

const crudEntries = Object.entries(Cruds);

type ResolverType = "Query" | "Mutation";
function generateResolversByType(type: ResolverType, opts?: CrudOptions) {
  return crudEntries
    .filter(([modelName]) => includeModel(modelName, opts))
    .map(([modelName, config]) => {
      const resolverEntries = Object.entries(config[type === "Query" ? "queries" : "mutations"]);

      return resolverEntries.map(([operationName, resolverObjectDefiner]) => {
        const resolverName = operationName + modelName;
        const isntPrismaFieldList = ["count", "deleteMany", "updateMany"];
        const isPrismaField = !isntPrismaFieldList.includes(operationName);

        const getFields = (t: any) => {
          const field = resolverObjectDefiner(t);
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
            [resolverName]: isPrismaField
              ? t.prismaField(handledField)
              : t.field(handledField),
          }
        }

        return type === "Query"
          ? builder.queryFields((t) => getFields(t))
          : builder.mutationFields((t) => getFields(t));
      });
    });
}

export function generateAllObjects(opts?: CrudOptions) {
  return crudEntries
    .filter(([md]) => includeModel(md, opts))
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

type CrudOptions = {
  include?: Model[];
  exclude?: Model[];
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

const includeModel = (model: string, opts?: CrudOptions): boolean => {
  if (!opts) return true;
  if (opts.include) return opts.include.includes(model as Model);
  if (opts.exclude) return !opts.exclude.includes(model as Model);
  return true;
};

export function generateAllCrud(opts?: CrudOptions) {
  generateAllObjects(opts);
  generateAllQueries(opts);
  generateAllMutations(opts);
}
`;
}
