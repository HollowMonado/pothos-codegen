# Prisma Generator Pothos Codegen

![Group 1](https://github.com/Cauen/prisma-generator-pothos-codegen/assets/8796757/19f6cdbe-44f5-40ac-8b9b-326c49c1c281)

A [prisma](https://www.prisma.io/) [generator](https://www.prisma.io/docs/concepts/components/prisma-schema/generators) plugin that auto-generates [Pothos](https://pothos-graphql.dev/) GraphQL input types and crud operations (all queries and mutations).

Easily convert a prisma schema into a full graphql CRUD API.

On `prisma generate` we create:

- All [input types](https://pothos-graphql.dev/docs/guide/inputs) for `Create`, `Find`, `Update`, `Sort` and `Delete` operations (to be used as args in [fields](https://pothos-graphql.dev/docs/guide/fields#arguments)).
- (Optional): Create all `Objects`, `Queries` and `Mutations` base files (to create customizable resolvers).
- (Optional): Execute all these base files without customization to create a default CRUD.

## Table of Contents

<!-- toc -->

- [Getting Started](#getting-started)
    - [Install](#install)
    - [Peer dependencies](#peer-dependencies)
    - [Set Up](#set-up)
        - [Add the generator to your schema.prisma](#add-the-generator-to-your-schemaprisma)
        - [Add scalar types to the builder](#add-scalar-types-to-the-builder)
        - [Create a configuration file (optional)](#create-a-configuration-file--optional-)
        - [Run the generator](#run-the-generator)
- [Usage](#usage)
    - [Inputs](#inputs)
    - [Objects](#objects)
    - [Queries and Mutations](#queries-and-mutations)
    - [Auto define all `objects`, `queries` and `mutations` (crud operations)](#auto-define-all--objects----queries--and--mutations---crud-operations-)
    - [Examples](#examples)
- [Disclosures](#disclosures)
    - [Models with only relations](#models-with-only-relations)
    - [BigInt rename](#bigint-rename)

<!-- tocstop -->

## Getting Started

### Install

Using yarn

```sh
yarn add -D prisma-generator-pothos-codegen
```

or using npm

```sh
npm install --save-dev prisma-generator-pothos-codegen
```

### Peer dependencies

The package has been developed and tested up to the following peer dependencies (see updated [example](/examples/inputs-simple-sqlite)):

<!-- TODO Maybe we could have some sort of automated pipeline that tests different versions of these peer deps? -->

```
"@pothos/core": "^4.0.2",
"@pothos/plugin-prisma": "^4.0.3"",
"@prisma/client": "^5.15.1",
"prisma": "^5.15.1",
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
  provider = "prisma-generator-pothos-codegen"
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
import { Scalars } from "prisma-generator-pothos-codegen";
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

/** @type {import('prisma-generator-pothos-codegen').Config} */
module.exports = {
    inputs:  },
    crud: {
        outputDir: "./src/graphql/__generated__/",
        inputsImporter: `import * as Inputs from '@graphql/__generated__/inputs';`,
        resolverImports: `import prisma from '@lib/prisma';`,
        prismaCaller: "prisma",
    },
    global: {},
};
```

<details>
  <summary>Click to see all configuration options</summary>

```ts
{
  /** Input type generation config */
  inputs?: {
    /** How to import the Prisma namespace. Default: `"import { Prisma } from '.prisma/client';"` */
    prismaImporter?: string;
    /** List of excluded scalars from generated output */
    excludeScalars?: string[];
    /** Map all Prisma fields with "@id" attribute to Graphql "ID" Scalar.
     *
     * ATTENTION: Mapping non String requires a conversion inside resolver, once GraphQl ID Input are coerced to String by definition. Default: false */
    mapIdFieldsToGraphqlId?: false | 'WhereUniqueInputs';
  };
  /** CRUD generation config */
  crud?: {
    /** Disable generaton of crud. Default: `false` */
    disabled?: boolean;
    /** How to import the inputs. Default `"import * as Inputs from '../inputs';"` */
    inputsImporter?: string;
    /** How to import the Prisma namespace at the objects.ts file. Default `"import { Prisma } from '.prisma/client';"`. Please use "resolverImports" to import prismaClient at resolvers. */
    prismaImporter?: string;
    /** How to call the prisma client. Default `'context.prisma'` */
    prismaCaller?: string;
    /** Any additional imports you might want to add to the resolvers (e.g. your prisma client). Default: `''` */
    resolverImports?: string;
    /** Directory to generate crud code into from project root. Default: `'./generated'` */
    outputDir?: string;
    /** A boolean to enable/disable generation of `autocrud.ts` which can be imported in schema root to auto generate all crud objects, queries and mutations. Default: `true` */
    generateAutocrud?: boolean;
    /** An array of parts of resolver names to be excluded from generation. Ie: ["User"] Default: [] */
    excludeResolversContain?: string[];
    /** An array of resolver names to be excluded from generation. Ie: ["upsertOneComment"] Default: [] */
    excludeResolversExact?: string[];
    /** An array of parts of resolver names to be included from generation (to bypass exclude contain). Ie: if exclude ["User"], include ["UserReputation"] Default: [] */
    includeResolversContain?: string[];
    /** An array of resolver names to be included from generation (to bypass exclude contain). Ie: if exclude ["User"], include ["UserReputation"] Default: [] */
    includeResolversExact?: string[];
    /** Caution: This delete the whole folder (Only use if the folder only has auto generated contents). A boolean to delete output dir before generate. Default: False */
    deleteOutputDirBeforeGenerate?: boolean;
    /** Export all crud queries/mutations/objects in objects.ts at root dir. Default: true */
    exportEverythingInObjectsDotTs?: boolean;
    /** Map all Prisma fields with "@id" attribute to Graphql "ID" Scalar. Default: 'Objects' */
    mapIdFieldsToGraphqlId?: false | 'Objects';
    /** Change the generated variables from object.base.ts from something like `UserName` to `User_Name`. This avoids generated duplicated names in some cases. See [issue #58](https://github.com/Cauen/prisma-generator-pothos-codegen/issues/58). Default: false */
    underscoreBetweenObjectVariableNames?: false | 'Objects';
  };
  /** Global config */
  global?: {
    /** Location of builder to replace in all files. Relative to package root. ie: './src/schema/builder'. Default: './builder' */
    builderImportPath?: string;
    /** Run function before generate */
    beforeGenerate?: (dmmf: DMMF.Document) => void;
    /** Run function after generate */
    afterGenerate?: (dmmf: DMMF.Document) => void;
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

## Usage

### Inputs

You can use `@Pothos.omit()` function calls in your prisma schema field descriptions to control which fields are used in the generated input types.

- `@Pothos.omit()` Omits the field from all inputs
- `@Pothos.omit(create)` Omits field from the create input
- `@Pothos.omit(orderBy, where, update)` Omits field from the orderBy, where, and update inputs, but not the create input

The available options are `create`, `update`, `where`, and `orderBy`.

```prisma
model User {
  /// @Pothos.omit(create, update)
  id        String   @id @default(uuid())
  email     String
  /// @Pothos.omit()
  password  String
}
```

You can also augment/derive new inputs from the generated `inputs.ts` file.

```ts
// ./src/graphql/User/inputs.ts

import { Prisma } from "@prisma/client";
// Import generated input fields definition
import { UserUpdateInputFields } from "@/graphql/__generated__/inputs";

// Note: you can't use `builder.inputType` to generate this new input
export const UserUpdateInputCustom = builder
    .inputRef<Prisma.UserUpdateInput & { customArg: string }>("UserUpdateInputCustom")
    .implement({
        fields: (t) => ({
            ...UserUpdateInputFields(t),
            customArg: t.field({ required: true, type: "String" }),
        }),
    });
```

### Objects

```ts
// ./src/graphql/User/object.ts

import { UserObject } from "@/graphql/__generated__/User";
import { builder } from "@/graphql/builder"; // Pothos schema builder

// Use the Object export to accept all default generated query code
builder.prismaObject("User", UserObject);

// Or modify it as you wish
builder.prismaObject("User", {
    ...UserObject,
    fields: (t) => {
        // Type-safely omit and rename fields
        const { password: _password, email: emailAddress, ...fields } = UserObject.fields(t);
        const sessionsField = UserSessionsFieldObject(t);

        return {
            ...fields,
            // Renamed field
            emailAddress,
            // Edit and extend field
            sessions: t.relation("sessions", {
                ...sessionsField,
                args: {
                    ...sessionsField.args,
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

```ts
// ./src/graphql/User/query.ts

import { findManyUserQuery, findManyUserQueryObject } from "@/graphql/__generated__/User";
import { builder } from "@/graphql/builder"; // Pothos schema builder

// Use the Query exports to accept all default generated query code
builder.queryFields(findManyUserQuery);

// Use the QueryObject exports to override or add to the generated code
builder.queryFields((t) => {
    const field = findManyUserQueryObject(t);
    return {
        findManyUser: t.prismaField({
            // Inherit all the generated properties
            ...field,

            // Modify the args and use custom arg in a custom resolver
            args: {
                ...field.args,
                customArg: t.arg({ type: "String", required: false }),
            },
            resolve: async (query, root, args, context, info) => {
                const { customArg } = args;
                console.log(customArg);
                return field.resolve(query, root, args, context, info);
            },

            // Add an custom extension
            authScopes: { admin: true },
        }),
    };
});
```

### Auto define all `objects`, `queries` and `mutations` (crud operations)

First, make sure that `options.crud.generateAutocrud` isn't set to `false`

```ts
// ./src/schema/index.ts (import autocrud.ts)
import {
  generateAllCrud,
  generateAllObjects,
  generateAllQueries,
  generateAllMutations
} from '@/graphql/__generated__/autocrud.ts',
import { builder } from '@/graphql/builder'; // Pothos schema builder

// (option 1) generate all objects, queries and mutations
generateAllCrud()

// (option 2) or create them separately
generateAllObjects()
generateAllQueries()
generateAllMutations()

// (option 3) or limit crud generation
generateAllObjects({ include: ["User", "Profile", 'Comment'] })
generateAllQueries({ exclude: ["Comment"] })
generateAllMutations({ exclude: ["User"] })

// Defining schema roots
builder.queryType({});
builder.mutationType({});

export const schema = builder.toSchema({});
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

### Examples

Check for the [example](/examples/inputs-simple-sqlite) for a running sample

![image](https://user-images.githubusercontent.com/8796757/222917186-9a88f5e9-27c6-44b5-8653-fa9efb0aa255.png)

## Disclosures

### Models with only relations

- We create a custom scalar `NEVER` that avoids this error: `Input Object type FollowUpdateManyMutationInput must define one or more fields.` from Graphql. if you have models that are relations-only. Like N-N fields without `no relation fields` or id-only models, we set field `_` of some operations to this scalar. If you fill this fake property, the operation will result in a error.

### BigInt rename

- As `BigInt` is reserved, we export `Bigint` for the BigInt scalar.
