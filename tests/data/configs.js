// fallow-ignore-file unused-file
// Loaded dynamically by parseConfig() in the config tests, so static analysis
// can't see the reference.

/** @type {import('../../src/utils/config').Config} */
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
