import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateTotal } from "./pricing.ts";

test("no discount under 10 units", () => {
  assert.equal(calculateTotal(5, 10), 50);
});

test("10% discount at exactly 10 units", () => {
  assert.equal(calculateTotal(10, 10), 90);
});

test("10% discount below 50 units", () => {
  assert.equal(calculateTotal(30, 10), 270);
});

test("20% discount at exactly 50 units", () => {
  assert.equal(calculateTotal(50, 10), 400);
});
