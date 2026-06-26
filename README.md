# Prisma Generator Pothos Codegen

![Group 1](https://github.com/Cauen/prisma-generator-pothos-codegen/assets/8796757/19f6cdbe-44f5-40ac-8b9b-326c49c1c281)

A [prisma](https://www.prisma.io/) [generator](https://www.prisma.io/docs/concepts/components/prisma-schema/generators) plugin that auto-generates [Pothos](https://pothos-graphql.dev/) GraphQL input types and crud operations (all queries and mutations).

Easily convert a prisma schema into a full graphql CRUD API.

On `prisma generate` we create:

- All [input types](https://pothos-graphql.dev/docs/guide/inputs) for `Create`, `Find`, `Update`, `Sort` and `Delete` operations (to be used as args in [fields](https://pothos-graphql.dev/docs/guide/fields#arguments)).
- A base file per model with all `Objects`, `Queries` and `Mutations` (to create customizable resolvers).
- An `autocrud.ts` file that can wire up a default CRUD for every model without any customization.

## Table of Contents

<!-- toc -->

- [Getting Started](#getting-started)
    - [Install](#install)
    - [Peer dependencies](#peer-dependencies)
    - [Set Up](#set-up)
        - [Add the generator to your schema.prisma](#add-the-generator-to-your-schemaprisma)
        - [Add scalar types to the builder](#add-scalar-types-to-the-builder)
        - [Create a configuration file (optional)](#create-a-configuration-file-optional)
        - [Run the generator](#run-the-generator)
- [Generated Output](#generated-output)
- [Usage](#usage)
    - [Inputs](#inputs)
    - [Objects](#objects)
    - [Queries and Mutations](#queries-and-mutations)
    - [Auto define all `objects`, `queries` and `mutations` (crud operations)](#auto-define-all-objects-queries-and-mutations-crud-operations)
- [Disclosures](#disclosures)
    - [Simple mode (no nested inputs)](#simple-mode-no-nested-inputs)
    - [Models with only relations](#models-with-only-relations)
    - [BigInt rename](#bigint-rename)

<!-- tocstop -->

## Getting Started

### Install

This package is published to the private registry at `npm.internal.ember-coding.com` under the
`@ember-coding` scope. Point the scope at the registry once (in your project's `.npmrc`
or `~/.npmrc`):

```ini
@ember-coding:registry=https://npm.internal.ember-coding.com/
//npm.internal.ember-coding.com/:_authToken=${NPM_TOKEN}
```

Then install with yarn

```sh
yarn add -D @ember-coding/ember-pothos-codegen
```

or using npm

```sh
npm install --save-dev @ember-coding/ember-pothos-codegen
```

### Peer dependencies

The package has been developed and tested up to the following peer dependencies:

```
"@pothos/core": "^4.13.0",
"@pothos/plugin-prisma": "^4.14.3",
"@prisma/client": "^7.8.0",
"prisma": "^7.8.0",
```

Using higher versions may break something. In these cases, please open a new issue.

### Set Up

#### Add the generator to your schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

generator pothos {
  provider = "prisma-pothos-types"
}

generator pothosCrud {
  provider = "@ember-coding/ember-pothos-codegen"
  generatorConfigPath = "./pothos.config.js"
  // You may also set the `generatorConfigPath` via the `POTHOS_CRUD_CONFIG_PATH` environment variable.
  // The environment variable will override the path hardcoded here.
}

/// This is a user!
model User {
  /// This is an id!
  id  String  @id
}
```

#### Add scalar types to the builder

```ts
import { Scalars } from "@ember-coding/ember-pothos-codegen";
import { Prisma } from ".prisma/client";

export const builder = new SchemaBuilder<{
    // ... Context, plugins? ...
    PrismaTypes: PrismaTypes; // required for @pothos/plugin-prisma integration (which is required)
    Scalars: Scalars<Prisma.Decimal, Prisma.InputJsonValue | null, Prisma.InputJsonValue>; // required to define correct types for created scalars.
}>({
    // Other builder config
});
```

#### Create a configuration file (optional)

```js
// ./pothos.config.js

/** @type {import('@ember-coding/ember-pothos-codegen').Config} */
module.exports = {
    inputs: {
        prismaImporter: `import { Prisma } from '@prisma/client';`,
    },
    crud: {
        prismaCaller: "prisma",
    },
    global: {
        outputDir: "./src/graphql/__generated__/",
        builderImportPath: "./src/graphql/builder",
    },
};
```

> The `prismaCaller` defaults to `context.prisma`. The example above assumes you expose your client some other way (e.g. an imported `prisma` singleton). Make sure the generated resolvers can actually reach it.

<details>
  <summary>Click to see all configuration options</summary>

```ts
{
  /** Input type generation config */
  inputs?: {
    /** Disable generation of nested create, update and delete input types. Default: `true` */
    noNestedInput?: boolean;
    /** Models that should keep their nested create/update/delete inputs even when `noNestedInput` is enabled. Default: `[]` */
    nestedInputModels?: string[];
    /** How to import the Prisma namespace. Default: `"import { Prisma } from '.prisma/client';"` */
    prismaImporter?: string;
    /** List of excluded scalars from generated output. Default: `[]` */
    excludeScalars?: string[];
    /** Exclude specific fields from generated input types, keyed by operation then by model name or the `$all` wildcard. Default: `{}` */
    excludeInputFields?: {
      create?: Record<string | "$all", string[]>;
      update?: Record<string | "$all", string[]>;
      where?: Record<string | "$all", string[]>;
      orderBy?: Record<string | "$all", string[]>;
    };
    /** Map all Prisma fields with "@id" attribute to Graphql "ID" Scalar.
     *
     * ATTENTION: Mapping non String requires a conversion inside resolver, once GraphQl ID Input are coerced to String by definition. Default: false */
    mapIdFieldsToGraphqlId?: false | 'WhereUniqueInputs';
  };
  /** CRUD generation config */
  crud?: {
    /** How to import the inputs. Default `"import * as Inputs from '../inputs.js';"` */
    inputsImporter?: string;
    /** How to import the Prisma namespace at the objects.ts file. Default `"import { Prisma } from '.prisma/client';"`. */
    prismaImporter?: string;
    /** How to call the prisma client inside resolvers. Default `'context.prisma'` */
    prismaCaller?: string;
    /** Any additional imports you might want to add to the resolvers (e.g. your prisma client). Default: `''` */
    resolverImports?: string;
    /** An array of parts of resolver names to be excluded from generation. Ie: ["User"] Default: [] */
    excludeResolversContain?: string[];
    /** An array of resolver names to be excluded from generation. Ie: ["upsertOneComment"] Default: [] */
    excludeResolversExact?: string[];
    /** An array of parts of resolver names to be included from generation (to bypass exclude contain). Ie: if exclude ["User"], include ["UserReputation"] Default: [] */
    includeResolversContain?: string[];
    /** An array of resolver names to be included from generation (to bypass exclude contain). Ie: if exclude ["User"], include ["UserReputation"] Default: [] */
    includeResolversExact?: string[];
    /** Map all Prisma fields with "@id" attribute to Graphql "ID" Scalar. Default: 'Objects' */
    mapIdFieldsToGraphqlId?: false | 'Objects';
  };
  /** Global config */
  global?: {
    /** Caution: This deletes the whole folder (Only use if the folder only has auto generated contents). A boolean to delete output dir before generate. Default: false */
    deleteOutputDirBeforeGenerate?: boolean;
    /** Directory to generate crud code into from project root. Default: `'./generated'` */
    outputDir?: string;
    /** Location of the builder to import in all generated files. Default: `'./builder'` */
    builderImportPath?: string;
  };
}
```

</details>
<br/>

#### Run the generator

```sh
yarn prisma generate
```

or

```sh
npx prisma generate
```

## Generated Output

Everything is written into `global.outputDir` (default `./generated`). The layout is:

```
generated/
├── inputs.ts            # scalar types, enums, and every Prisma input type as a Pothos input ref
├── objects.ts           # `BatchPayload` object, the `modelNames` list and the `Model` type
├── utils.ts             # internal type helpers (PrismaObject / QueryObject / MutationObject, ...)
├── autocrud.ts          # `generateAllCrud` and friends + the `Cruds` registry
└── User/                # one folder per model
    ├── index.ts         # re-exports object.base, queries and mutations
    ├── object.base.ts   # `UserObject`
    ├── queries/
    │   ├── index.ts
    │   ├── count.base.ts
    │   ├── findFirst.base.ts
    │   ├── findMany.base.ts
    │   └── findUnique.base.ts
    └── mutations/
        ├── index.ts
        ├── createMany.base.ts
        ├── createOne.base.ts
        ├── deleteMany.base.ts
        ├── deleteOne.base.ts
        ├── updateMany.base.ts
        ├── updateOne.base.ts
        └── upsertOne.base.ts
```

Each model's `index.ts` re-exports everything, so you can import from the model folder directly:

- `UserObject` — the prisma object definition
- `findManyUserQueryObject`, `findManyUserQueryArgs` (and the same for `count`, `findFirst`, `findUnique`)
- `createOneUserMutationObject`, `createOneUserMutationArgs` (and the same for the other mutations)

Each `*QueryObject` / `*MutationObject` export is a plain definition object (`{ type, nullable, args, resolve }`) ready to hand to `t.prismaField` or `t.field`.

## Usage

### Inputs

By default the generator runs in **simple mode** (`inputs.noNestedInput: true`): nested
`create` / `update` / `delete` relation operations are stripped from the generated input
types. See [Simple mode](#simple-mode-no-nested-inputs) for how to opt specific models back in.

You can control which fields end up in the generated input types with `inputs.excludeInputFields`.
It is keyed by operation (`create`, `update`, `where`, `orderBy`), then by model name or the
`$all` wildcard:

```js
// ./pothos.config.js
module.exports = {
    inputs: {
        excludeInputFields: {
            create: {
                $all: ["id"], // omit `id` from every model's create input
                User: ["password"], // omit `password` from the User create input
            },
            update: {
                User: ["password"],
            },
        },
    },
};
```

The generated input types are exported from `inputs.ts` as Pothos input refs and can be used
directly as field types (this is exactly what the generated resolvers do):

```ts
// ./src/graphql/User/inputs.ts
import * as Inputs from "@/graphql/__generated__/inputs";

// Inputs.UserWhereInput, Inputs.UserCreateInput, Inputs.UserOrderByWithRelationInput, ...
builder.queryField("users", (t) =>
    t.prismaField({
        type: ["User"],
        args: {
            where: t.arg({ type: Inputs.UserWhereInput, required: false }),
        },
        resolve: (query, _root, args, ctx) =>
            ctx.prisma.user.findMany({ ...query, where: args.where ?? undefined }),
    })
);
```

### Objects

```ts
// ./src/graphql/User/object.ts

import { UserObject } from "@/graphql/__generated__/User";
import { builder } from "@/graphql/builder"; // Pothos schema builder

// Use the Object export to accept all default generated object code
builder.prismaObject("User", UserObject);

// Or modify it as you wish
builder.prismaObject("User", {
    ...UserObject,
    fields: (t) => {
        // Type-safely omit and rename fields
        const { password: _password, email: emailAddress, ...fields } = UserObject.fields(t);

        return {
            ...fields,
            // Renamed field
            emailAddress,
            // Edit and extend a relation field
            sessions: t.relation("sessions", {
                args: {
                    customArg: t.arg({ type: "String", required: false }),
                },
                authScopes: { admin: true },
            }),
            // Add custom fields
            customField: t.field({
                type: "String",
                resolve: () => "Hello world!",
            }),
        };
    },
});
```

### Queries and Mutations

Each operation is exported as a definition object. Pass it to `t.prismaField` (or `t.field`
for the non-prisma operations `count`, `deleteMany` and `updateMany`).

```ts
// ./src/graphql/User/query.ts

import { findManyUserQueryObject } from "@/graphql/__generated__/User";
import { builder } from "@/graphql/builder"; // Pothos schema builder

// Use the QueryObject export to accept all default generated query code
builder.queryFields((t) => ({
    findManyUser: t.prismaField(findManyUserQueryObject),
}));

// Or override / extend the generated definition
builder.queryFields((t) => {
    const field = findManyUserQueryObject;
    return {
        findManyUser: t.prismaField({
            // Inherit all the generated properties
            ...field,

            // Modify the args and use a custom arg in a custom resolver
            args: {
                ...field.args,
                customArg: t.arg({ type: "String", required: false }),
            },
            resolve: async (query, root, args, context, info) => {
                const { customArg } = args;
                console.log(customArg);
                return field.resolve(query, root, args, context, info);
            },

            // Add a custom extension
            authScopes: { admin: true },
        }),
    };
});
```

Mutations work the same way:

```ts
// ./src/graphql/User/mutation.ts

import { createOneUserMutationObject } from "@/graphql/__generated__/User";
import { builder } from "@/graphql/builder";

builder.mutationFields((t) => ({
    createOneUser: t.prismaField(createOneUserMutationObject),
}));
```

### Auto define all `objects`, `queries` and `mutations` (crud operations)

The `autocrud.ts` file is always generated and wires up every model for you.

```ts
// ./src/schema/index.ts (import autocrud.ts)
import {
    generateAllCrud,
    generateAllObjects,
    generateAllQueries,
    generateAllMutations,
} from "@/graphql/__generated__/autocrud";
import { builder } from "@/graphql/builder"; // Pothos schema builder

// (option 1) generate all objects, queries and mutations
generateAllCrud();

// (option 2) or create them separately
generateAllObjects();
generateAllQueries();
generateAllMutations();

// (option 3) or limit crud generation
generateAllObjects({ includeModel: { User: true, Profile: true, Comment: true } });
generateAllQueries({ excludeModel: { Comment: true } });
generateAllMutations({ excludeOperation: { User: ["deleteOne", "deleteMany"] } });

// Defining schema roots
builder.queryType({});
builder.mutationType({});

export const schema = builder.toSchema({});
```

`generateAllCrud`, `generateAllObjects`, `generateAllQueries` and `generateAllMutations` all
accept the same options object:

```ts
type CrudOptions = {
    /** Only generate the listed models. */
    includeModel?: Partial<Record<Model, boolean>>;
    /** Generate every model except the listed ones. */
    excludeModel?: Partial<Record<Model, boolean>>;
    /** Per model: only generate the listed operations. */
    includeOperation?: Partial<Record<Model, OperationName[]>>;
    /** Per model: generate every operation except the listed ones. */
    excludeOperation?: Partial<Record<Model, OperationName[]>>;
    /**
     * Caution: This is not type safe.
     * Wrap all queries/mutations to override args, run extra code in the resolve
     * function (ie: throw errors, logs), apply plugins, etc.
     */
    handleResolver?: (props: {
        modelName: Model;
        field: any;
        operationName: string;
        resolverName: string;
        t: any;
        isPrismaField: boolean;
        type: "Query" | "Mutation";
    }) => any;
};
```

Generated queries:

- count
- findFirst
- findMany
- findUnique

Generated mutations:

- createMany
- createOne
- deleteMany
- deleteOne
- updateMany
- updateOne
- upsertOne

## Disclosures

### Simple mode (no nested inputs)

By default `inputs.noNestedInput` is `true`, which strips nested write operations
(`create`, `connectOrCreate`, `createMany`, `upsert`, `update`, `updateMany`, `delete`,
`deleteMany`) from the generated input types. This keeps the generated schema flat and avoids
deeply nested mutation inputs.

To allow nested inputs for specific models, list them in `inputs.nestedInputModels`:

```js
module.exports = {
    inputs: {
        // keep nested create/update/delete inputs for these models only
        nestedInputModels: ["User", "Post"],
    },
};
```

To allow nested inputs everywhere, set `inputs.noNestedInput: false`.

### Models with only relations

- We create a custom scalar `NEVER` that avoids this error: `Input Object type FollowUpdateManyMutationInput must define one or more fields.` from Graphql. If you have models that are relations-only (like N-N fields without `no relation fields`, id-only models, or an input whose only fields were nested operations stripped by simple mode), we set a field `_` of those operations to this scalar. If you fill this fake property, the operation will result in an error.

### BigInt rename

- As `BigInt` is reserved, we export `Bigint` for the BigInt scalar.
</content>
</invoke>
