export function makeObjectTemplate({
    modelName,
    fields,
}: {
    modelName: string;
    fields: string;
}) {
    return `
export const ${modelName}Object = builder.prismaObject('${modelName}', {
  fields: (t) => ({
    ${fields}
  }),
});
`;
}
