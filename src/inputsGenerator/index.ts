import type { DMMF } from "@prisma/generator-helper";
import path from "path";
import { env } from "process";
import { ConfigInternal } from "utils/config.js";
import { writePothosFile } from "utils/filesystem.js";
import {
    getEnums,
    getImports,
    getInputs,
    getScalars,
    getUtil,
} from "./utils/parts";

/** Types may vary between Prisma versions */
export type Scalars<DecimalType, JsonInput, JsonOutput> = {
    DateTime: { Input: Date; Output: Date };

    Decimal: { Input: DecimalType; Output: DecimalType };
    BigInt: { Input: bigint; Output: bigint };
    Json: { Input: JsonInput; Output: JsonOutput };
    Bytes: { Input: Buffer; Output: { type: "Buffer"; data: number[] } };
    NEVER: { Input: void; Output: void };
};

export async function generateInputs({
    config,
    dmmf,
}: {
    config: ConfigInternal;
    dmmf: DMMF.Document;
}): Promise<void> {
    if (env.isTesting)
        await writePothosFile({
            content: JSON.stringify(dmmf, null, 2),
            destination: "dmmf.json",
        });

    const fileLocation = path.join(config.global.outputDir, "inputs.ts");

    const imports = getImports({ config });
    const util = getUtil();
    const scalars = getScalars({ config, dmmf });
    const enums = getEnums({ dmmf });
    const inputs = getInputs({ config, dmmf });
    const content = [imports, util, scalars, enums, inputs].join("\n\n");

    await writePothosFile({ content: content, destination: fileLocation });
}
