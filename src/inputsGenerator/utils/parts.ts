import type { DMMF } from "@prisma/generator-helper";
import { ConfigInternal } from "utils/config.js";
import { getUsedScalars } from "./dmmf.js";
import { getInputFieldsString } from "./inputFields.js";
import { bigIntScalar, bytesScalar, dateTimeScalar, decimalScalar, jsonScalar, neverScalar } from "./templates.js";

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
    return [config.inputs.prismaImporter, `import { builder } from "${config.global.builderImportPath}"`].join("\n");
}

export function getScalars({ config, dmmf }: { config: ConfigInternal; dmmf: DMMF.Document }) {
    const usedScalars = getUsedScalars({ config, dmmf });

    return [
        ...(usedScalars.hasDateTime ? [dateTimeScalar] : []),
        ...(usedScalars.hasDecimal ? [decimalScalar] : []),
        ...(usedScalars.hasBytes ? [bytesScalar] : []),
        ...(usedScalars.hasJson ? [jsonScalar] : []),
        ...(usedScalars.hasBigInt ? [bigIntScalar] : []),
        ...(usedScalars.hasNEVER ? [neverScalar] : []),
    ].join("\n\n");
}

export function getUtil({ config, dmmf }: { config: ConfigInternal; dmmf: DMMF.Document }) {
    const usedScalars = getUsedScalars({ config, dmmf });

    const stringFilters = `string: Prisma.StringFieldUpdateOperationsInput;
nullableString: Prisma.NullableStringFieldUpdateOperationsInput;`;
    const intFilters = `int: Prisma.IntFieldUpdateOperationsInput;
nullableInt: Prisma.NullableIntFieldUpdateOperationsInput;`;
    const boolFilters = `bool: Prisma.BoolFieldUpdateOperationsInput;
nullableBool: Prisma.NullableBoolFieldUpdateOperationsInput;`;
    const bigIntFilters = `bigInt: Prisma.BigIntFieldUpdateOperationsInput;
nullableBigInt: Prisma.NullableBigIntFieldUpdateOperationsInput;`;
    const bytesFilters = `bytes: Prisma.BytesFieldUpdateOperationsInput;
nullableBytes: Prisma.NullableBytesFieldUpdateOperationsInput;`;
    const decimalFilters = `decimal: Prisma.DecimalFieldUpdateOperationsInput;
nullableDecimal: Prisma.NullableDecimalFieldUpdateOperationsInput;`;
    const dateTimeFilters = `dateTime: Prisma.DateTimeFieldUpdateOperationsInput;
nullableDateTime: Prisma.NullableDateTimeFieldUpdateOperationsInput;`;

    const usedFilters = [
        stringFilters,
        intFilters,
        boolFilters,
        usedScalars.hasBigInt ? bigIntFilters : undefined,
        usedScalars.hasBytes ? bytesFilters : undefined,
        usedScalars.hasDecimal ? decimalFilters : undefined,
        usedScalars.hasDateTime ? dateTimeFilters : undefined,
    ].filter(Boolean) as string[];

    const generatedFiltersType = `type Filters = {
${usedFilters.join("\n")}
};`;

    return `${generatedFiltersType}

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
            allowedKeywords.some((allowedKeyword) => input.name.includes(allowedKeyword)) ||
            Object.keys(inputNames).some((inputName) => input.name.startsWith(inputName))
        );
    });

    return filteredInputs
        .map((input) => {
            const model = Object.entries(inputNames).find(([inputName]) => input.name.startsWith(inputName))?.[1];

            const inputName = input.name.replace("Unchecked", "");
            const prismaInputName = input.name;
            const { fields, filteredFields } = getInputFieldsString({
                input: input,
                model: model,
                config: config,
            });
            const finalFields = fields.replaceAll("Unchecked", "");
            let inputType = `Prisma.${prismaInputName}`;
            const omitedFieldsString = filteredFields.map((field) => `'${field}'`).join(" | ");
            if (filteredFields.length > 0) {
                inputType = `Omit<Prisma.${prismaInputName}, ${omitedFieldsString}>`;
            }

            return `export const ${inputName} = builder.inputRef<PrismaUpdateOperationsInputFilter<${inputType}>, false>('${inputName}').implement({
  fields: (t) => ({
    ${finalFields}
  }),
});`;
        })
        .join("\n\n");
}

export function getInputs({ config, dmmf }: { config: ConfigInternal; dmmf: DMMF.Document }) {
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
                ].reduce((prev, keyword) => ({ ...prev, [`${curr.name}${keyword}`]: curr }), {}),
            };
        },
        {} as Record<string, DMMF.Model>
    );
    return makeInputs({ config: config, dmmf: dmmf, inputNames: inputNames });
}
