// Test doubles: a scripted doctl (records every call) and a scripted fetch.
import { createDoctl } from "../lib/doctl.mjs";

export const APP_ID = "5070cde0-f34d-439d-a2f9-6375dccdf5b2";
export const SHA = "e91a30c415617f533592a89c4ccf78ebb2013b0e";

export const baseConfig = (over = {}) => ({
  root: "/repo",
  app: "krizaka-com",
  url: "https://www.krizaka.com",
  health: "https://www.krizaka.com/api/health",
  indexing: "on",
  indexingVariable: false,
  spec: "deploy/digitalocean/app.yaml",
  product: null,
  seoFamily: null,
  waitMinutes: 25,
  ...over,
});

export const liveSpec = (over = {}) => ({
  name: "krizaka-com",
  services: [
    {
      name: "web",
      envs: [
        { key: "NEXT_PUBLIC_MEDIA_CDN_URL", scope: "RUN_AND_BUILD_TIME", value: "https://krizaka-assets.b-cdn.net" },
        { key: "MAIL_API_KEY", scope: "RUN_TIME", type: "SECRET", value: "EV[1:ciphertext-a]" },
        { key: "MAIL_DOMAIN", scope: "RUN_TIME", value: "mg.krizaka.com" },
      ],
    },
  ],
  ...over,
});

/** A doctl whose answers come from `state`; every call is pushed to `calls` as the arguments after `--context default`. */
export function fakeDoctl(state = {}, calls = []) {
  const s = {
    team: "Krizaka-team",
    spec: liveSpec(),
    phases: ["PENDING_BUILD", "BUILDING", "DEPLOYING", "ACTIVE"],
    commit: SHA,
    previous: { id: "prev-1", commit: "aaaaaaaa11111111aaaaaaaa11111111aaaaaaaa" },
    ...state,
  };
  let polls = 0;
  const exec = async (args, options = {}) => {
    calls.push({ args: args.slice(2), input: options.input });
    if (args[0] !== "--context" || args[1] !== "default") throw new Error("a doctl call without --context default");
    const [a, b] = args.slice(2);
    const key = `${a} ${b}`;
    if (key === "account get") return JSON.stringify([{ team: { name: s.team } }]);
    if (key === "apps list") return JSON.stringify(s.apps ?? [{ id: APP_ID, spec: { name: "krizaka-com" } }]);
    if (key === "apps get") {
      const spec = s.deployed ? (s.specAfter ?? s.spec) : s.spec;
      return JSON.stringify([{ id: APP_ID, spec, active_deployment: { id: s.deployed ? "new-1" : s.previous.id, services: [{ name: "web", source_commit_hash: s.deployed ? s.commit : s.previous.commit }] } }]);
    }
    if (key === "apps create-deployment") {
      s.deployed = false;
      return JSON.stringify([{ id: "new-1", phase: "PENDING_BUILD" }]);
    }
    if (key === "apps get-deployment") {
      const phase = s.phases[Math.min(polls++, s.phases.length - 1)];
      if (phase === "ACTIVE") s.deployed = true;
      return JSON.stringify([{ id: "new-1", phase, services: [{ name: "web", source_commit_hash: s.commit }] }]);
    }
    if (key === "apps spec") return "";
    if (key === "apps update") return "";
    throw new Error(`unscripted doctl call: ${args.slice(2).join(" ")}`);
  };
  const doctl = createDoctl({ exec, env: {} });
  return { doctl, calls, state: s };
}

/** fetch answering from a { url-or-path: { status, body, headers } } table. */
export function fakeFetch(table) {
  const calls = [];
  const fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const hit = table[url] ?? table[new URL(url).pathname];
    if (!hit) return new Response("not found", { status: 404 });
    if (hit instanceof Error) throw hit;
    return new Response(hit.body ?? "", { status: hit.status ?? 200, headers: hit.headers ?? {} });
  };
  fetch.calls = calls;
  return fetch;
}

export const ROBOTS_ON = "User-agent: *\nAllow: /\n\nSitemap: https://www.krizaka.com/sitemap.xml\n";
export const ROBOTS_OFF = "User-agent: *\nDisallow: /\n";
