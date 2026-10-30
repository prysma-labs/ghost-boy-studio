import assert from "node:assert/strict";
import test from "node:test";
import { buildRunRequest } from "../lib/dispatch.ts";

const env = {
  AGENT_SHARED_SECRET: "shared-secret",
  AGENT_URL_DIRECTOR: "https://director.example/",
  AGENT_URL_DESIGNER: "https://designer.example",
  AGENT_URL_WRITER: "https://writer.example",
  AGENT_URL_MUSICIAN: "https://musician.example",
  AGENT_URL_ANIMATOR: "https://animator.example",
};

test("the selected agent is sent to that agent's sandbox", () => {
  const director = buildRunRequest("director", "storyboard?", [{ role: "user", content: "prior" }], env);
  const animator = buildRunRequest("animator", "animate?", [], env);
  assert.equal(director.url, "https://director.example/runs");
  assert.equal(animator.url, "https://animator.example/runs");
  assert.equal(director.init.headers.authorization, "Bearer shared-secret");
  assert.deepEqual(JSON.parse(director.init.body as string).history, [{ role: "user", content: "prior" }]);
  assert.notEqual(director.url, animator.url);
});
