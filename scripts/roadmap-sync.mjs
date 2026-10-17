#!/usr/bin/env node
// Keeps the org project "Krizaka Roadmap" (project 4) true: recomputes Status from the issue and pull request state
// and adds every open issue of the organisation that is not on the project yet.
//
//   node scripts/roadmap-sync.mjs [--dry] [--org krizaka] [--project 4]
//
// Token: ROADMAP_TOKEN (or GH_TOKEN) with `project` and `repo` read scopes (a fine-grained token or a GitHub App on
// the organisation: the workflow's default GITHUB_TOKEN cannot reach an organisation project).
// A pull request is linked when it closes the issue ("Closes #n", or the Development sidebar); a mere mention does not count.
// Rules (the pure function `decideStatus`):
//   closed issue                                    -> Done
//   open, a linked pull request that is a draft     -> In progress
//   open, a linked pull request that is open        -> In review
//   open, was Done / In review with no open PR      -> Next   (reopened, or the PR was closed without merging)
//   anything else                                   -> untouched (Backlog / Next / In progress are planning decisions)
// A new open issue is added with Status Backlog. Nothing is ever deleted and no issue is closed or edited.

const API = "https://api.github.com/graphql";

/** Pure rule: the Status an item should have, or null to leave it as it is. */
export function decideStatus({ state, prs = [], current = null }) {
  if (state === "CLOSED") return current === "Done" ? null : "Done";
  const open = prs.filter((p) => p.state === "OPEN");
  const want = open.length === 0 ? null : open.every((p) => p.isDraft) ? "In progress" : "In review";
  if (want) return current === want ? null : want;
  if (current === "Done" || current === "In review") return "Next";
  return null;
}

/** What the sync would change: [{ key, itemId, from, to }] for the items whose Status differs from the rule. */
export function plan(items) {
  const out = [];
  for (const it of items) {
    const to = decideStatus({ state: it.state, prs: it.prs, current: it.status });
    if (to) out.push({ key: it.key, itemId: it.itemId, from: it.status, to });
  }
  return out;
}

async function gql(token, query, variables = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(API, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "user-agent": "krizaka-roadmap-sync" },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    const msg = JSON.stringify(json.errors ?? "");
    if (json.errors && /rate limit|secondary|timeout/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 15000 * (attempt + 1)));
      continue;
    }
    if (json.errors) throw new Error(msg.slice(0, 400));
    return json.data;
  }
  throw new Error("GitHub API kept rate limiting");
}

const ITEMS = `query($org:String!,$n:Int!,$after:String){organization(login:$org){projectV2(number:$n){
  id
  field(name:"Status"){... on ProjectV2SingleSelectField{id options{id name}}}
  items(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{id
    status:fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}
    content{__typename ... on Issue{number state repository{name}
      closedByPullRequestsReferences(first:10,includeClosedPrs:false){nodes{state isDraft}}}}}}}}}`;

export async function loadProject(token, org, number) {
  const items = [];
  let after = null, project = null, statusField = null;
  for (;;) {
    const d = await gql(token, ITEMS, { org, n: number, after });
    const p = d.organization.projectV2;
    project = p.id;
    statusField = p.field;
    for (const n of p.items.nodes) {
      const c = n.content;
      if (!c || c.__typename !== "Issue") continue;
      const prs = [...(c.closedByPullRequestsReferences?.nodes ?? [])];
      items.push({ key: `${c.repository.name}#${c.number}`, itemId: n.id, state: c.state, status: n.status?.name ?? null, prs });
    }
    if (!p.items.pageInfo.hasNextPage) break;
    after = p.items.pageInfo.endCursor;
  }
  return { project, statusField, items };
}

async function openIssuesOfOrg(token, org) {
  const found = [];
  for (const range of ["created:<2026-10-10", "created:2026-10-10..2026-12-31", "created:>2026-12-31"]) {
    let after = null;
    for (;;) {
      const d = await gql(token, `query($q:String!,$a:String){search(query:$q,type:ISSUE,first:100,after:$a){pageInfo{hasNextPage endCursor} nodes{... on Issue{id number repository{name}}}}}`, { q: `org:${org} is:issue is:open ${range}`, a: after });
      found.push(...d.search.nodes.filter((n) => n.id).map((n) => ({ key: `${n.repository.name}#${n.number}`, id: n.id })));
      if (!d.search.pageInfo.hasNextPage) break;
      after = d.search.pageInfo.endCursor;
    }
  }
  return found;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
  const dry = args.includes("--dry");
  const org = arg("--org", "krizaka");
  const number = Number(arg("--project", "4"));
  const token = process.env.ROADMAP_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.log("roadmap-sync: no ROADMAP_TOKEN, nothing done (the built-in project workflows keep working).");
    return;
  }
  const { project, statusField, items } = await loadProject(token, org, number);
  const option = Object.fromEntries(statusField.options.map((o) => [o.name, o.id]));

  const changes = plan(items);
  console.log(`status changes: ${changes.length}`);
  for (const c of changes) console.log(`  ${c.key}: ${c.from ?? "-"} -> ${c.to}`);

  const known = new Set(items.map((i) => i.key));
  const missing = (await openIssuesOfOrg(token, org)).filter((i) => !known.has(i.key));
  console.log(`open issues not on the project: ${missing.length}`);
  for (const m of missing) console.log(`  ${m.key}`);
  if (dry) return;

  for (const c of changes) {
    await gql(token, `mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){clientMutationId}}`, { p: project, i: c.itemId, f: statusField.id, o: option[c.to] });
  }
  for (const m of missing) {
    const d = await gql(token, `mutation($p:ID!,$c:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}}`, { p: project, c: m.id });
    await gql(token, `mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){clientMutationId}}`, { p: project, i: d.addProjectV2ItemById.item.id, f: statusField.id, o: option.Backlog });
  }
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
