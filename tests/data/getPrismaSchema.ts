import { getDMMF } from "@prisma/internals";
import { readFileSync } from "fs";

const simplePrismaSchemaPath = "./tests/data/simpleSchema.prisma";
const complexPrismaSchemaPath = "./tests/data/complexSchema.prisma";

export const getSampleDMMF = async (type: "complex" | "simple") => {
    const datamodelSchemaPath =
        type === "complex" ? complexPrismaSchemaPath : simplePrismaSchemaPath;

    const schema = await readFileSync(datamodelSchemaPath, {
        encoding: "utf8",
    });

    return getDMMF({ datamodel: schema });
};
