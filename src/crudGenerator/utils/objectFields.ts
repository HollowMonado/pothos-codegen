import type { DMMF } from "@prisma/generator-helper";

export function getObjectFieldsString({
    modelName,
    dmmfFields,
}: {
    modelName: string;
    dmmfFields: readonly DMMF.Field[];
}): { fields: string[] } {
    const fields = [] as string[];

    dmmfFields.forEach(({ type: fieldType, name: fieldName, relationName, isRequired }) => {
        if (relationName) {
            // Relation
            fields.push(`${fieldName}: t.relation('${fieldName}', { nullable: ${!isRequired} }),`);
        } else {
            // Scalar (DateTime, Json, Enums, etc.)
            fields.push(`${fieldName}: t.expose("${fieldName}", {type: "${fieldType}", nullable: ${!isRequired}}),`);
        }
    });

    return { fields };
}
