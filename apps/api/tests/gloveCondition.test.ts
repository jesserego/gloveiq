import test from "node:test";
import assert from "node:assert/strict";
import { gloveConditionLabelFromScore, scoreGloveCondition } from "@gloveiq/shared";

test("scoreGloveCondition returns the expected weighted score and label", () => {
  const result = scoreGloveCondition({
    structure: 7,
    leather: 8,
    palm: 6,
    laces: 7,
    cosmetics: 6,
  });

  assert.equal(result.rawScore, 69.5);
  assert.equal(result.conditionScore, 7.0);
  assert.equal(result.label, "Well Maintained Gamer");
  assert.deepEqual(result.weightedPoints, {
    structure: 21,
    leather: 20,
    palm: 12,
    laces: 10.5,
    cosmetics: 6,
  });
});

test("gloveConditionLabelFromScore clamps to the documented score bands", () => {
  assert.equal(gloveConditionLabelFromScore(9.5), "Brand New / Factory Mint");
  assert.equal(gloveConditionLabelFromScore(8.7), "Like New");
  assert.equal(gloveConditionLabelFromScore(4.9), "Heavily Used");
  assert.equal(gloveConditionLabelFromScore(1.2), "Destroyed");
});
