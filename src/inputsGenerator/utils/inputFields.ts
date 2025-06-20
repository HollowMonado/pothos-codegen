import type { DMMF } from "@prisma/generator-helper";
import { ConfigInternal } from "utils/config.js";
import { firstLetterLowerCase } from "utils/string.js";
import { getMainInput } from "./dmmf.js";

/** Convert array of fields to a string code representation */
export function getInputFieldsString({
    input,
    model,
    config,
}: {
    input: DMMF.InputType;
    model: DMMF.Model | undefined;
    config: ConfigInternal;
}): {
    fields: string;
    filteredFields: string[];
} {
    const nestedMutations = [
        "create",
        "connectOrCreate",
        "createMany",
        "upsert",
        "update",
        "updateMany",
        "delete",
        "deleteMany",
    ];
    let exclusionMap: Record<string, string[]> = {};
    if (input.name.startsWith(`${model?.name}Create`)) {
        exclusionMap = config.inputs.excludeInputFields.create ?? {};
    } else if (input.name.startsWith(`${model?.name}Update`)) {
        exclusionMap = config.inputs.excludeInputFields.update ?? {};
    } else if (input.name.startsWith(`${model?.name}Where`)) {
        exclusionMap = config.inputs.excludeInputFields.where ?? {};
    } else if (input.name.startsWith(`${model?.name}OrderBy`)) {
        exclusionMap = config.inputs.excludeInputFields.orderBy ?? {};
    }

    const exclusionArray = [...(exclusionMap["$all"] ?? [])];
    const modelName = model?.name ?? "";
    if (modelName in exclusionMap) {
        exclusionArray.push(...exclusionMap[modelName]);
    }

    const filteredFields: string[] = [];
    const filtered = input.fields.filter((field) => {
        if (config.global.noNestedInput) {
            if (nestedMutations.includes(field.name)) {
                filteredFields.push(field.name);
                return false;
            }
        }

        if (exclusionArray.includes(field.name)) {
            filteredFields.push(field.name);
            return false;
        }

        return true;
    });

    // Convert remaining fields to string representation
    const fields =
        filtered.length === 0
            ? ["_: t.field({ type: NEVER }),"]
            : filtered.map((field) => {
                  const { isList, type, location } = getMainInput().run(field.inputTypes);
                  const props = {
                      required: field.isRequired,
                      description: undefined,
                  };

                  const defaultScalarList = ["String", "Int", "Float", "Boolean"];
                  const isScalar = location === "scalar" && defaultScalarList.includes(type.toString());

                  const getFieldType = () => {
                      if (isList) {
                          return `${type}List`;
                      }

                      if (isScalar && config.inputs.mapIdFieldsToGraphqlId === "WhereUniqueInputs") {
                          const fieldDetails = model?.fields.find((f) => f.name === field.name);
                          if (fieldDetails?.isId) {
                              return "id";
                          }
                      }
                      return type.toString();
                  };

                  const getScalar = () => {
                      // TODO parse date to string ??
                      const fieldType = getFieldType();
                      return `${firstLetterLowerCase(fieldType)}(${JSON.stringify(props)})`;
                  };

                  const getField = () => {
                      // BigInt is reserved
                      const renamedType = type === "BigInt" ? "Bigint" : type;
                      const fieldType = isList ? `[${renamedType}]` : renamedType.toString();
                      const relationProps = { ...props, type: fieldType };
                      // "type":"CommentCreateInput" -> "type":CommentCreateInput
                      return `field(${JSON.stringify(relationProps).replace(/(type.+:)"(.+)"/, "$1$2")})`;
                  };

                  return `${field.name}: t.${isScalar ? getScalar() : getField()},`;
              });

    const sep = "\n  ";
    return { fields: fields.join(sep), filteredFields: filteredFields };
}
