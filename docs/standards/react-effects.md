# React effects — `useEffect` is for the outside world only

<!-- summary: useEffect is for the outside world only: data is a query, derived state is computed, and a lint ratchet counts what is left. -->

> Oussama, 2026-10-27: « bug à adresser partout ». One rule for every Krizaka React app (Next.js, Vite/Tauri desktop,
> Expo). Enforced by `@krizaka/config` (`krizakaStack()`): `krizaka/no-async-in-effect` and
> `krizaka/no-derived-state-in-effect`, counted per repository by `krizaka-ratchet` (`asyncInEffect`,
> `derivedStateInEffect` in `lint-ratchet.json`). The count only goes down; new code cannot add one.
> Server state itself: [`@krizaka/query`](https://ui.krizaka.com/packages/query) — never `@tanstack/*` directly
> (krizaka-ui ADR-001).

## The rule

1. **Async data is a query.** Reading from an API, a BFF or a Tauri `invoke` backend call is `useQuery`; writing is
   `useMutation`; both from `@krizaka/query`. Never from a `useEffect`.
2. **Syncing React state is computed during render.** « If A changes, `setB(…)` » is a derived value, or a `key` that
   resets the component. Never a `useEffect`.
3. **`useEffect` stays for real external side effects**, and only these:
   - a subscription to a system that **pushes** events (Tauri `listen`, WebSocket, `EventSource`, DOM events), with its
     cleanup. The callback may tie the event to the cache: `queryClient.invalidateQueries` / `setQueryData`;
   - `URL.createObjectURL`, created **and** revoked in the **same** effect — never in `useMemo` (an impure `useMemo`
     breaks under StrictMode).
4. **No race by hand.** `onClick={async () => setX(await api.get(id))}` lets a slow answer for A overwrite the answer for
   B. Put the selection in the query key (`useQuery({ queryKey: [..., id] })`): a stale response is dropped.

## 1. Async data — `useQuery` / `useMutation`

```tsx
// ✕ before: loading state, no cancel, a stale answer can win
const [files, setFiles] = useState<FileEntry[]>([]);
useEffect(() => {
  invoke<FileEntry[]>("list_files", { dir }).then(setFiles);
}, [dir]);

// ✓ after: keyed by the directory, cached, cancelled, deduplicated
const files = useQuery({
  queryKey: filesKeys.list(dir),
  queryFn: () => invoke<FileEntry[]>("list_files", { dir }),
});
```

```tsx
// ✕ before
async function remove(path: string) {
  await invoke("delete_file", { path });
  setFiles(await invoke("list_files", { dir }));
}

// ✓ after: the write is a mutation, the read refreshes by invalidation
const queryClient = useQueryClient();
const remove = useMutation({
  mutationFn: (path: string) => invoke("delete_file", { path }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: filesKeys.all }),
});
// <Button onClick={() => remove.mutate(path)} loading={remove.isPending} />
```

Keys come from `defineKeys` (one module per resource). Calls to our own HTTP API go through `krizakaFetch`.

## 2. Derived state — render, not effect

```tsx
// ✕ before: renders twice, flashes the old value
const [dir, setDir] = useState(root);
useEffect(() => { setDir(root); }, [root]);

// ✓ after, value derived: the user's choice wins, otherwise the prop
const [picked, setPicked] = useState<string | null>(null);
const dir = picked ?? root;
```

```tsx
// ✕ before: reset the form when the item changes
useEffect(() => { setDraft(item.title); }, [item.id]);

// ✓ after: a key remounts the component with fresh state
<ItemEditor key={item.id} item={item} />
```

## 3. What `useEffect` is for

```tsx
// ✓ a pushed event, with cleanup, tied to the cache
const queryClient = useQueryClient();
useEffect(() => {
  const un = listen("file-added", () => queryClient.invalidateQueries({ queryKey: filesKeys.all }));
  return () => { void un.then((off) => off()); };
}, [queryClient]);

// ✓ an object URL: created and revoked in the same effect
const [url, setUrl] = useState<string | null>(null);
useEffect(() => {
  if (!blob) return;
  const next = URL.createObjectURL(blob);
  setUrl(next);
  return () => URL.revokeObjectURL(next);
}, [blob]);
```

## 4. Races — select by key

```tsx
// ✕ before: click A then B quickly, A's slow answer replaces B's preview
async function select(path: string) {
  setSelected(path);
  setPreview(await invoke("read_file", { path }));
}

// ✓ after: the selection is state, the preview is a query keyed by it
const [selected, setSelected] = useState<string | null>(null);
const preview = useQuery({
  queryKey: filesKeys.preview(selected),
  queryFn: () => invoke("read_file", { path: selected }),
  enabled: selected !== null,
});
```

## Enforcement

| Where | What |
| :--- | :--- |
| ESLint `krizakaStack()` | `krizaka/no-async-in-effect` (an `await`, `.then(`, `fetch`, `invoke`, `api.*`, `*Client.*` in an effect that is not a subscribe-and-cleanup) and `krizaka/no-derived-state-in-effect` (an effect whose only statements are `setX(…)`), `error` by default. A repository with debt passes `effects: "warn"` until its count is 0. |
| `krizaka-ratchet` | counters `asyncInEffect` and `derivedStateInEffect` in `lint-ratchet.json`; `--update` lowers them, never raises them. |
| Review | an effect that sets state from a prop, or loads data, is a blocker. |

Every repository's `AGENTS.md` links here. A derived-state violation left for later is an issue on the board (Next),
never a baseline raised.
