"use client";

import type { StoreApi, UseBoundStore } from "zustand";
import { useActivityStore } from "@/stores/activityStore";
import { useDialogueStore } from "@/stores/dialogueStore";
import { useExamStore } from "@/stores/examStore";
import { useGrammarStore } from "@/stores/grammarStore";
import { useLearnStore } from "@/stores/learnStore";
import { useNumbersStore } from "@/stores/numbersStore";
import { useQuizStore } from "@/stores/quizStore";
import { useReadingStore } from "@/stores/readingStore";
import { useSentenceStore } from "@/stores/sentenceStore";
import { useSrsStore } from "@/stores/srsStore";
import { useVerbStore } from "@/stores/verbStore";
import { SRS_STATE_VERSION } from "@/lib/srsData";
import type { SrsState } from "@/lib/srsData";
import type { SyncedKey } from "./syncKeys";

type PersistedStore = UseBoundStore<StoreApi<unknown>> & {
  persist: { rehydrate: () => Promise<void> | void; getOptions: () => { name?: string } };
};

const STORES = [
  useActivityStore,
  useDialogueStore,
  useExamStore,
  useGrammarStore,
  useLearnStore,
  useNumbersStore,
  useQuizStore,
  useReadingStore,
  useSentenceStore,
  useSrsStore,
  useVerbStore,
] as unknown as PersistedStore[];

const META_KEY = "deutsch-learner:sync-meta";
const PUSH_DELAY_MS = 2000;

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

/** When each store last changed on this device (ms). Compared with the server's `updatedAt`. */
type Meta = Partial<Record<SyncedKey, number>>;

function readMeta(): Meta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? "{}") as Meta;
  } catch {
    return {};
  }
}

function writeMeta(meta: Meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* storage full or blocked: sync still works for this page load */
  }
}

function readLocal(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function keyOf(store: PersistedStore) {
  return store.persist.getOptions().name as SyncedKey;
}

let started = false;
let applying = false;
const dirty = new Set<SyncedKey>();
let timer: ReturnType<typeof setTimeout> | null = null;
let onStatus: (s: SyncStatus) => void = () => {};

async function push() {
  timer = null;
  if (dirty.size === 0) return;
  const meta = readMeta();
  const keys = [...dirty];
  dirty.clear();
  const items = keys
    .map((k) => ({ storeKey: k, data: readLocal(k), updatedAt: meta[k] ?? Date.now() }))
    .filter((i) => i.data !== undefined);
  if (items.length === 0) return;
  onStatus("syncing");
  try {
    const res = await fetch("/api/progress", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
      keepalive: true,
    });
    if (!res.ok) throw new Error(String(res.status));
    onStatus("synced");
  } catch {
    keys.forEach((k) => dirty.add(k));
    onStatus("error");
    schedule(15000);
  }
}

function schedule(delay = PUSH_DELAY_MS) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(push, delay);
}

function markDirty(key: SyncedKey) {
  const meta = readMeta();
  meta[key] = Date.now();
  writeMeta(meta);
  dirty.add(key);
  schedule();
}

/** Applies a server copy: SRS cards are merged per card, every other store takes the newer copy whole. */
async function applyRemote(store: PersistedStore, data: unknown) {
  const key = keyOf(store);
  const remote = data as { state?: unknown; version?: number };
  if (key === "deutsch-learner:srs" && remote?.version === SRS_STATE_VERSION && remote.state) {
    await useSrsStore.persist.rehydrate();
    useSrsStore.getState().importState(remote.state as SrsState, "merge");
    return;
  }
  localStorage.setItem(key, JSON.stringify(data));
  await store.persist.rehydrate();
}

/** Sends any changes still waiting for the debounce. Call before signing out. */
export async function flushSync(): Promise<void> {
  if (timer) clearTimeout(timer);
  await push();
}

/** Pulls the account's progress, merges it into this device, then keeps pushing local changes. */
export async function startSync(statusCallback: (s: SyncStatus) => void) {
  if (started) return;
  started = true;
  onStatus = statusCallback;
  onStatus("syncing");

  try {
    const res = await fetch("/api/progress", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const { items } = (await res.json()) as { items: { storeKey: SyncedKey; data: unknown; updatedAt: number }[] };
    const remote = new Map(items.map((i) => [i.storeKey, i]));
    const meta = readMeta();

    applying = true;
    for (const store of STORES) {
      const key = keyOf(store);
      const r = remote.get(key);
      const hasLocal = readLocal(key) !== undefined;
      if (r && r.updatedAt > (meta[key] ?? 0)) {
        await applyRemote(store, r.data);
        meta[key] = r.updatedAt;
        // The SRS merge can hold cards the server lacks: send the merged deck back.
        if (key === "deutsch-learner:srs" && hasLocal) {
          meta[key] = Date.now();
          dirty.add(key);
        }
      } else if (hasLocal && (!r || (meta[key] ?? 0) > r.updatedAt)) {
        meta[key] ??= Date.now();
        dirty.add(key);
      }
    }
    writeMeta(meta);
    onStatus("synced");
  } catch {
    onStatus("error");
  } finally {
    applying = false;
  }

  for (const store of STORES) {
    const key = keyOf(store);
    store.subscribe(() => {
      if (!applying) markDirty(key);
    });
  }
  window.addEventListener("pagehide", () => void push());
  if (dirty.size) schedule(0);
}
