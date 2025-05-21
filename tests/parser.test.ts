import { describe, expect, test } from "vitest";
import { parseComment } from "../src/inputsGenerator/utils/parser.ts";
describe("parseComment", () => {
    test("Check all possible inputs", async () => {
        expect(parseComment(`test`)).toEqual(null);
        expect(
            parseComment(`@Pothos.omit(create, update) createdAt description`)
        ).toEqual(expect.arrayContaining(["create", "update"]));
        expect(parseComment(`@Pothos.omit()`)).toEqual("all");
        expect(parseComment(`@Pothos.omit(create)`)).toEqual(
            expect.arrayContaining(["create"])
        );
        expect(parseComment(`@Pothos.omit(create,update,)`)).toEqual(
            expect.arrayContaining(["create", "update"])
        );
        expect(parseComment(`@Pothos.omit(create,update,`)).toEqual(null);
        expect(parseComment(`@Pothos.omit(create,updatex)`)).toEqual(null);
        expect(parseComment(`test @Pothos.omit(create,update) test`)).toEqual(
            expect.arrayContaining(["create", "update"])
        );
    });
});
