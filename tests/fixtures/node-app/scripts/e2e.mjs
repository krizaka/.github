// Stand-in for a sharded Playwright run: proves node-ci passes --shard=i/n.
const shard = process.argv.find((a) => /^--shard=\d+\/\d+$/.test(a));
if (!shard) {
  console.error("no --shard argument");
  process.exit(1);
}
console.log("e2e", shard);
