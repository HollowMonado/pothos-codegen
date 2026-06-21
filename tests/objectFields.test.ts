import type { DMMF } from "@prisma/generator-helper";
import { describe, expect, it } from "vitest";
import { getObjectFieldsString } from "../src/crudGenerator/utils/objectFields.ts";

describe("objectFields", () => {
    it("exposes scalar fields and maps relations", () => {
        const dmmfFields = [
            { name: "id", type: "Int", isRequired: true },
            { name: "bio", type: "String", isRequired: false },
            { name: "posts", type: "Post", relationName: "PostToUser", isRequired: false },
            { name: "profile", type: "Profile", relationName: "ProfileToUser", isRequired: true },
        ] as unknown as readonly DMMF.Field[];

        const { fields } = getObjectFieldsString({ modelName: "User", dmmfFields });

        expect(fields).toEqual([
            `id: t.expose("id", {type: "Int", nullable: false}),`,
            `bio: t.expose("bio", {type: "String", nullable: true}),`,
            `posts: t.relation('posts', { nullable: true }),`,
            `profile: t.relation('profile', { nullable: false }),`,
        ]);
    });
});
