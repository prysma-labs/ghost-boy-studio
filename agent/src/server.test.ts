import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { MemoryStore } from "./memory-store.js";
import { promptFor } from "./prompts.js";
import { createAgentServer } from "./server.js";
import type { HistoryMessage, RunInput } from "./types.js";

const secret = "test-secret";

function deferred() {
  let resolve: (value: string) => void = () => undefined;
  const promise = new Promise<string>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function listen(agentId: string, store: MemoryStore, run: (input: RunInput) => Promise<string>) {
  const server = createAgentServer({ agentId, secret, store, run });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${address.port}` };
}

async function post(url: string, body: unknown, token = secret) {
  return fetch(`${url}/runs`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("routes each agent to its own service and keeps histories apart", async () => {
  const store = new MemoryStore();
  const seen: Record<string, RunInput[]> = { director: [], designer: [] };
  const gates = { director: deferred(), designer: deferred() };

  const director = await listen("director", store, async (input) => {
    seen.director.push(input);
    return gates.director.promise;
  });
  const designer = await listen("designer", store, async (input) => {
    seen.designer.push(input);
    return gates.designer.promise;
  });

  try {
    const directorHealth = await fetch(`${director.url}/health`).then((response) => response.json());
    const designerHealth = await fetch(`${designer.url}/health`).then((response) => response.json());
    assert.deepEqual(directorHealth, { ok: true, agentId: "director" });
    assert.deepEqual(designerHealth, { ok: true, agentId: "designer" });

    const targets = { director: director.url, designer: designer.url };
    const first = await post(targets.director, {
      content: "Board the opening?",
      history: [{ role: "user", content: "Earlier direction" }],
    });
    assert.equal(first.status, 202);
    const busy = await post(targets.director, { content: "Again", history: [] });
    assert.equal(busy.status, 409);

    const second = await post(targets.designer, {
      content: "Sheet for the lead?",
      history: [{ role: "assistant", content: "Earlier design note" }],
    });
    assert.equal(second.status, 202);

    assert.equal(seen.director[0]?.systemPrompt, promptFor("director"));
    assert.equal(seen.designer[0]?.systemPrompt, promptFor("designer"));
    assert.deepEqual(seen.director[0]?.history, [{ role: "user", content: "Earlier direction" }]);
    assert.deepEqual(seen.designer[0]?.history, [
      { role: "assistant", content: "Earlier design note" },
    ]);
    assert.equal(seen.director[0]?.content, "Board the opening?");

    gates.designer.resolve("The lead sheet is written.");
    await waitFor(async () => (await store.listMessages("designer")).some((message) => message.role === "assistant"));
    gates.director.resolve("The opening board is written.");
    await waitFor(async () => (await store.latestRun("director"))?.status === "completed");

    const directorMessages = await store.listMessages("director");
    const designerMessages = await store.listMessages("designer");
    assert.deepEqual(
      directorMessages.map((message) => message.content),
      ["Board the opening?", "The opening board is written."],
    );
    assert.deepEqual(
      designerMessages.map((message) => message.content),
      ["Sheet for the lead?", "The lead sheet is written."],
    );
    assert.equal((await store.listMessages("director")).length, directorMessages.length);
  } finally {
    director.server.close();
    designer.server.close();
  }
});

test("a restart marks the active run failed and a late reply does not complete it", async () => {
  const store = new MemoryStore();
  const gate = deferred();
  const agent = await listen("writer", store, () => gate.promise);
  try {
    const response = await post(agent.url, { content: "Write the opening scene.", history: [] });
    assert.equal(response.status, 202);
    await store.failInterrupted("writer");
    gate.resolve("This should not be saved.");
    await new Promise((resolve) => setTimeout(resolve, 30));
    const latest = await store.latestRun("writer");
    assert.equal(latest?.status, "failed");
    assert.equal(latest?.error, "Run interrupted by service restart.");
    assert.equal((await store.listMessages("writer")).some((message) => message.role === "assistant"), false);
  } finally {
    agent.server.close();
  }
});

test("rejects missing credentials", async () => {
  const store = new MemoryStore();
  const agent = await listen("musician", store, async () => "ok");
  try {
    const response = await post(agent.url, { content: "Cue the title?", history: [] as HistoryMessage[] }, "nope");
    assert.equal(response.status, 401);
  } finally {
    agent.server.close();
  }
});

async function waitFor(check: () => Promise<boolean>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out");
}
