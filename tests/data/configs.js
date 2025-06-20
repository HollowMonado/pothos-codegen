// /** @type {import('prisma-generator-pothos-codegen').Config} */

/** @type {import('../utils/config').Config} */
module.exports = {
    crud: {
        outputDir: "./src/schema/__generated__/",
        excludeResolversContain: ["User"],
        prismaCaller: "context.db",
        disabled: false,
        // inputsImporter: "import * as Inputs from '@/schema/inputs'",
    },
    inputs: {
        prismaImporter: `import { Prisma } from '.prisma/client';`,
    },
    global: {
        deleteOutputDirBeforeGenerate: true,
    },
};
