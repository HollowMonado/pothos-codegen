import type { DMMF } from "@prisma/generator-helper";
import { ConfigInternal } from "utils/config.js";
import { getUsedScalars } from "./dmmf.js";
import { getInputFieldsString } from "./inputFields.js";
import * as T from "./templates";

export function getEnums({ dmmf }: { dmmf: DMMF.Document }) {
    return [
        ...dmmf.schema.enumTypes.prisma,
        ...dmmf.datamodel.enums.map((el) => ({
            ...el,
            values: el.values.map(({ name }) => name),
        })),
    ]
        .map((el) => {
            const enumName = el.name;
            const enumValues = JSON.stringify(el.values);
            return `export const ${enumName} = builder.enumType('${enumName}', {
  values: ${enumValues} as const,
});`;
        })
        .join("\n\n");
}

export function getImports({ config }: { config: ConfigInternal }) {
    return [
        config.inputs.prismaImporter,
        `import { builder } from "../builder";`,
    ].join("\n");
}

export function getScalars({
    config,
    dmmf,
}: {
    config: ConfigInternal;
    dmmf: DMMF.Document;
}) {
    const excludeScalars = config.inputs.excludeScalars;
    const usedScalars = getUsedScalars(dmmf.schema.inputObjectTypes.prisma);
    return [
        ...(usedScalars.hasDateTime && !excludeScalars?.includes("DateTime")
            ? [T.dateTimeScalar]
            : []),
        ...(usedScalars.hasDecimal && !excludeScalars?.includes("Decimal")
            ? [T.decimalScalar]
            : []),
        ...(usedScalars.hasBytes && !excludeScalars?.includes("Bytes")
            ? [T.bytesScalar]
            : []),
        ...(usedScalars.hasJson && !excludeScalars?.includes("Json")
            ? [T.jsonScalar]
            : []),
        ...(usedScalars.hasBigInt && !excludeScalars?.includes("BigInt")
            ? [T.bigIntScalar]
            : []),
        ...(usedScalars.hasNEVER && !excludeScalars?.includes("NEVER")
            ? [T.neverScalar]
            : []),
    ].join("\n\n");
}

export function getUtil() {
    return `type Filters = {
  string: Prisma.StringFieldUpdateOperationsInput;
  nullableString: Prisma.NullableStringFieldUpdateOperationsInput;
  dateTime: Prisma.DateTimeFieldUpdateOperationsInput;
  nullableDateTime: Prisma.NullableDateTimeFieldUpdateOperationsInput;
  int: Prisma.IntFieldUpdateOperationsInput;
  nullableInt: Prisma.NullableIntFieldUpdateOperationsInput;
  bool: Prisma.BoolFieldUpdateOperationsInput;
  nullableBool: Prisma.NullableBoolFieldUpdateOperationsInput;
  bigInt: Prisma.BigIntFieldUpdateOperationsInput;
  nullableBigInt: Prisma.NullableBigIntFieldUpdateOperationsInput;
  bytes: Prisma.BytesFieldUpdateOperationsInput;
  nullableBytes: Prisma.NullableBytesFieldUpdateOperationsInput;
  float: Prisma.FloatFieldUpdateOperationsInput;
  nullableFloat: Prisma.NullableFloatFieldUpdateOperationsInput;
  decimal: Prisma.DecimalFieldUpdateOperationsInput;
  nullableDecimal: Prisma.NullableDecimalFieldUpdateOperationsInput;
};

type ApplyFilters<InputField> = {
  [F in keyof Filters]: 0 extends 1 & Filters[F]
    ? never
    : Filters[F] extends InputField
    ? Filters[F]
    : never;
}[keyof Filters];

type PrismaUpdateOperationsInputFilter<T extends object> = {
  [K in keyof T]: [ApplyFilters<T[K]>] extends [never] ? T[K] : ApplyFilters<T[K]>
};`;
}

function makeInputs({
    config,
    dmmf,
    inputNames,
}: {
    config: ConfigInternal;
    dmmf: DMMF.Document;
    inputNames: Record<string, DMMF.Model>;
}) {
    const prismaInputs = dmmf.schema.inputObjectTypes.prisma;
    const allowedKeywords = ["Filter", "Compound", "UpdateOperations"];
    const filteredInputs = prismaInputs.filter((input) => {
        return (
            allowedKeywords.some((allowedKeyword) =>
                input.name.includes(allowedKeyword)
            ) ||
            Object.keys(inputNames).some((inputName) =>
                input.name.startsWith(inputName)
            )
        );
    });

    return filteredInputs
        .map((input) => {
            const model = Object.entries(inputNames).find(([inputName]) =>
                input.name.startsWith(inputName)
            );

            const inputName = input.name.replace("Unchecked", "");
            const prismaInputName = input.name;
            const fields = getInputFieldsString({
                input: input,
                model: model?.[1],
                config: config,
            }).replaceAll("Unchecked", "");

            return `export const ${inputName} = builder.inputRef<PrismaUpdateOperationsInputFilter<Prisma.${prismaInputName}>, false>('${inputName}').implement({
  fields: (t) => ({
    ${fields}
  }),
});`;
        })
        .join("\n\n");
}

export function getInputs({
    config,
    dmmf,
}: {
    config: ConfigInternal;
    dmmf: DMMF.Document;
}) {
    // Map from possible input names to their related model
    const inputNames = dmmf.datamodel.models.reduce(
        (prev, curr) => {
            return {
                ...prev,
                ...[
                    "Where",
                    "ScalarWhere",
                    "Create",
                    "Update",
                    "Upsert",
                    "OrderBy",
                    "CountOrderBy",
                    "MaxOrderBy",
                    "MinOrderBy",
                    "AvgOrderBy",
                    "SumOrderBy",
                ].reduce(
                    (prev, keyword) => ({
                        ...prev,
                        [`${curr.name}${keyword}`]: curr,
                    }),
                    {}
                ),
            };
        },
        {} as Record<string, DMMF.Model>
    );

    return makeInputs({
        config: config,
        dmmf: dmmf,
        inputNames: inputNames,
    });
}
