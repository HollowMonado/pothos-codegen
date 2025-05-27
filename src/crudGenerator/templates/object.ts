import { ConfigInternal } from "utils/config.js";

export function makeObjectTemplate({
    config,
    modelName,
    fields,
}: {
    config: ConfigInternal;
    modelName: string;
    fields: string;
}) {
    return `import { builder } from "${config.global.builderImportPath}";
    
export const ${modelName}Object = builder.prismaObject('${modelName}', {
  fields: (t) => ({
    ${fields}
  }),
});
`;
}
