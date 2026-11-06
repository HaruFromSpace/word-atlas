import assert from "node:assert/strict";
import { test } from "node:test";
import type { Atlas, WordRef } from "../atlas/types";
import { buildSession, withoutSpelling } from "./session";
import { defaultSettings, emptyProgress } from "./store";

const words: WordRef[] = Array.from({ length: 40 }, (_, i) => ({ id: `w${i}`, word: `word${i}`, zh: `n. 词${i}`, ipa: "", cefr: 1, topic: 0, media: 0, order: i }));
const atlas = { words, byId: new Map(words.map((w) => [w.id, w])) } as unknown as Atlas;
const card = { due: 1, s: 30, d: 5, el: 0, sd: 1, ls: 0, reps: 5, lapses: 0, st: 2, seen: 1 } as const;
const progress = { ...emptyProgress("t"), cards: Object.fromEntries(words.map((w) => [w.id, card])) };

test("turning spelling off removes the spelling steps still ahead in a saved session", () => {
  const on = buildSession(atlas, progress, { ...defaultSettings, spell: true });
  const spellAt = on.steps.map((s, i) => (s.kind === "spell" ? i : -1)).filter((i) => i >= 0);
  assert.ok(spellAt.length > 1, "the fixture should plan some spelling steps");
  const sess = { ...on, index: spellAt[0] + 1 };
  const off = withoutSpelling(atlas, progress, { ...defaultSettings, spell: false }, sess);
  // steps already done stay as they were, every later one is another format with answer choices
  assert.deepEqual(off.steps.slice(0, sess.index), sess.steps.slice(0, sess.index));
  for (const step of off.steps.slice(sess.index)) {
    assert.notEqual(step.kind, "spell");
    if (step.kind !== "intro") assert.equal(step.options?.length, 4);
  }
  assert.equal(off.steps.length, sess.steps.length);
});

test("a spelling step that's already been answered is left for the learner to continue", () => {
  const on = buildSession(atlas, progress, { ...defaultSettings, spell: true });
  const i = on.steps.findIndex((s) => s.kind === "spell");
  const sess = { ...on, index: i, pending: { correct: true, value: on.steps[i].id } };
  assert.equal(withoutSpelling(atlas, progress, { ...defaultSettings, spell: false }, sess).steps[i].kind, "spell");
});

test("nothing changes when there is no spelling step ahead", () => {
  const sess = buildSession(atlas, progress, { ...defaultSettings, spell: false });
  assert.equal(withoutSpelling(atlas, progress, { ...defaultSettings, spell: false }, sess), sess);
});
