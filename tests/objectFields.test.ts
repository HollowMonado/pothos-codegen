import { describe, expect, it } from "vitest";
import { cleanifyDocumentation } from "../src/crudGenerator/utils/objectFields.ts";
import { escapeQuotesAndMultilineSupport } from "../src/utils/string.ts";

describe("objectFields", () => {
    it("cleanifyDocumentation", () => {
        expect(cleanifyDocumentation("line 1\nline2\n@Pothos.omit()")).toBe(
            "line 1\nline2"
        );
        expect(
            cleanifyDocumentation(
                "@Pothos.omit(create, update) createdAt description"
            )
        ).toBe("createdAt description");
    });

    it("convertToMultilineString + cleanifyDocumentation", () => {
        expect(
            escapeQuotesAndMultilineSupport(
                cleanifyDocumentation("line 1\nline2\n@Pothos.omit()")
            )
        ).toBe("`line 1\nline2`");
        expect(escapeQuotesAndMultilineSupport(cleanifyDocumentation(""))).toBe(
            undefined
        );
        expect(
            escapeQuotesAndMultilineSupport(
                cleanifyDocumentation("@Pothos.omit(create, update)  ")
            )
        ).toBe(undefined);
    });
});
