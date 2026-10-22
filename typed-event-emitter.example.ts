/**
 * typed-event-emitter.example.ts
 *
 * Usage examples for `TypedEventEmitter`. Every `emit`/`on` pair below is
 * checked at compile time: passing the wrong arguments is a type error.
 */

import { TypedEventEmitter } from "./typed-event-emitter";

type AppEvents = {
  "user:created": [id: string, email: string];
  "user:deleted": [id: string];
  "user:renamed": [id: string, previousName: string, nextName: string];
  ready: [];
  error: [error: Error];
};

const emitter = new TypedEventEmitter<AppEvents>();

// 1. Plain listeners.
emitter.on("user:created", (id, email) => {
  console.log(`created ${id} <${email}>`);
});

// 2. A one-shot listener: it unsubscribes itself after the first emission.
emitter.once("ready", () => {
  console.log("the application is ready");
});

// 3. A wildcard listener: it observes every event, including its arguments.
emitter.onAny((eventName, ...args) => {
  console.log("event", eventName, args);
});

// 4. Removing listeners.
const onDeleted = (id: string) => console.log(`deleted ${id}`);
emitter.on("user:deleted", onDeleted);
emitter.off("user:deleted", onDeleted); // remove a single listener
emitter.off("user:created"); // remove every listener of one event
emitter.off(); // remove everything

// 5. Waiting for the next occurrence of an event.
const created = await emitter.waitFor("user:created");

// 6. Async iteration over a single event.
for await (const id of emitter.stream("user:deleted")) {
  console.log("streamed delete", id);
  break; // leaving the loop unsubscribes the internal listener
}

// 7. Async iteration over every event.
for await (const { event, args } of emitter) {
  console.log("observed", event, args);
}

// 8. Emitting. The arguments must match the event signature exactly.
emitter.emit("user:created", "u_1", "ada@example.com");
emitter.emit("user:renamed", "u_1", "Ada", "Ada L.");
emitter.emit("ready");
emitter.emit("error", new Error("boom"));

export { created };
