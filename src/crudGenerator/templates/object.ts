import { ConfigInternal } from "utils/config.js";

export function makeObjectTemplate({
    modelName,
    fields,
}: {
    config: ConfigInternal;
    modelName: string;
    fields: string;
}) {
    return `import { PrismaObject } from "../utils.js";
    
export const ${modelName}Object = {
  fields: (t) => ({
    ${fields}
  }),
} satisfies PrismaObject<"${modelName}">;
`;
}
