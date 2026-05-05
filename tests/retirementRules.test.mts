import test from "node:test";
import assert from "node:assert/strict";
import {
    BUSINESS_TYPE_RATE,
    SUPPORT_TYPE_RATE,
    createDefaultRows,
    formatLevelGroupLabel,
    parseRatioCell,
    splitRatioInput
} from "../src/lib/business/retirementRules.ts";

test("retirement default rows create five editable year ratios for business and support", () => {
    const rows = createDefaultRows(2569);

    assert.equal(rows.length, 2);
    assert.equal(rows[0].key, String(BUSINESS_TYPE_RATE));
    assert.equal(rows[1].key, String(SUPPORT_TYPE_RATE));
    assert.equal(rows[0].typeLabel, "Business");
    assert.equal(rows[1].typeLabel, "Support");
    assert.equal(rows[0]["2569"], "0:1");
    assert.equal(rows[0]["2573"], "0:1");
    assert.equal(rows[1]["2573"], "0:1");
});

test("retirement ratio input keeps decimal rate and numeric base only", () => {
    assert.deepEqual(splitRatioInput("12.5abc:003คน"), { rateText: "12.5", baseText: "003" });
    assert.deepEqual(splitRatioInput("7.25"), { rateText: "7.25", baseText: "1" });
    assert.deepEqual(splitRatioInput(""), { rateText: "0", baseText: "1" });
});

test("retirement ratio parser falls back to safe defaults", () => {
    assert.deepEqual(parseRatioCell("12.5:003"), { rate: 12.5, base: 3 });
    assert.deepEqual(parseRatioCell("abc:0"), { rate: 0, base: 1 });
    assert.deepEqual(parseRatioCell(""), { rate: 0, base: 1 });
});

test("retirement level group labels include code and optional name", () => {
    assert.equal(formatLevelGroupLabel(" 03 ", " Manager "), "03 - Manager");
    assert.equal(formatLevelGroupLabel("03"), "03");
    assert.equal(formatLevelGroupLabel(""), "");
});
