import { expect, test } from "vitest"
import { rule_info } from "./shared_resources"

test('rule_info read only', () => {
    expect(rule_info.size + 1).toEqual(rule_info.size+=1)
})