import { expect, it } from "vitest"
import { cn } from "../../app/lib/utils"

it("merges classes, drops falsy values and lets later tailwind utilities win", () => {
    const hidden: boolean = false
    expect(cn("px-2 py-1", hidden && "hidden", "px-4")).toBe("py-1 px-4")
})
