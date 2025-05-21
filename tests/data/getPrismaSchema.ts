import { getDMMF, getSchema } from "@prisma/internals";
import path from "path";

const simplePrismaSchema = getSchema(
    path.join(__dirname, "./simpleSchema.prisma")
);
const complexPrismaSchema = getSchema(
    path.join(__dirname, "./complexSchema.prisma")
);

export const getSampleDMMF = async (type: "complex" | "simple") => {
    const datamodelSchema =
        type === "complex" ? complexPrismaSchema : simplePrismaSchema;

    return getDMMF({ datamodel: await datamodelSchema });
};
