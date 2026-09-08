import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus, transactionResultNumberToName } from "genlayer-js/types";
import { createHash } from "node:crypto";

const contract = process.env.RECALLROUTE_CONTRACT_ADDRESS?.trim();
const commit = process.env.RECALLROUTE_FIXTURE_COMMIT?.trim();
const repository = process.env.RECALLROUTE_FIXTURE_REPO?.trim() || "eaglebooth/RecallRoute";
if (!contract || !/^0x[0-9a-fA-F]{40}$/.test(contract)) throw new Error("Missing RECALLROUTE_CONTRACT_ADDRESS");
if (!commit || !/^[0-9a-f]{40}$/i.test(commit)) throw new Error("Missing full 40-character RECALLROUTE_FIXTURE_COMMIT");

async function readSecrets(count) {
  if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(true);
  process.stdin.resume();
  const values = []; let value = "";
  for await (const chunk of process.stdin) for (const character of String(chunk)) {
    if (character === "\r" || character === "\n") {
      if (value) { values.push(value.trim()); value = ""; if (values.length === count) { if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(false); return values; } }
    } else value += character;
  }
  return values;
}

const keys = await readSecrets(2);
if (keys.length !== 2) throw new Error("Pass authority and owner private keys as two stdin lines");
const authorityAccount = createAccount(keys[0].startsWith("0x") ? keys[0] : `0x${keys[0]}`);
const ownerAccount = createAccount(keys[1].startsWith("0x") ? keys[1] : `0x${keys[1]}`);
keys.fill("");
if (authorityAccount.address.toLowerCase() === ownerAccount.address.toLowerCase()) throw new Error("Authority and owner must differ");
const authority = createClient({ chain: studionet, account: authorityAccount });
const owner = createClient({ chain: studionet, account: ownerAccount });
const origin = `https://raw.githubusercontent.com/${repository}`;
const base = `${origin}/${commit}/samples`;

async function source(file, citation) {
  const url = `${base}/${file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fixture unavailable: ${url} (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text.split(citation).length - 1 !== 1) throw new Error(`Citation must occur exactly once in ${file}`);
  return { url, sha: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length, citation };
}

const oem = await source("oem-recall.txt", "RR48-OEM-SCOPE-2026");
const regulator = await source("regulator-recall.txt", "RR48-REGULATOR-SCOPE-2026");
const conflict = await source("regulator-conflict.txt", "RR48-REGULATOR-CONFLICT-2026");

function failure(tx, receipt) {
  const leader = tx?.consensus_data?.leader_receipt?.[0];
  const execution = String(leader?.execution_result ?? "").toUpperCase();
  const resultStatus = String(leader?.result?.status ?? "").toUpperCase();
  const finalized = String(tx?.statusName ?? receipt?.statusName ?? "").toUpperCase();
  const consensus = String(tx?.resultName ?? transactionResultNumberToName?.[String(tx?.result)] ?? "").toUpperCase();
  if (execution && execution !== "SUCCESS") return String(leader?.result?.payload?.readable ?? leader?.result?.payload ?? execution);
  if (["ROLLBACK", "ERROR", "FAILED"].some(x => resultStatus.includes(x))) return String(leader?.result?.payload?.readable ?? leader?.result?.payload ?? resultStatus);
  if (finalized && finalized !== "FINALIZED") return `status ${finalized}`;
  if (consensus && !["AGREE", "MAJORITY_AGREE"].includes(consensus)) return `consensus ${consensus}`;
  return "";
}

async function finalized(client, hash) {
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 2000, retries: 120 });
  let tx = receipt; try { tx = await client.getTransaction({ hash }); } catch {}
  return { receipt, tx };
}

async function read(functionName, args = []) {
  const raw = await authority.readContract({ address: contract, functionName, args });
  let value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (value && typeof value === "object" && Object.keys(value).length === 1 && "result" in value) {
    value = value.result; if (typeof value === "string") { try { return JSON.parse(value); } catch { return value; } }
  }
  return value;
}

const transactions = [];
async function write(label, functionName, args, client = authority, expectError = "") {
  const hash = await client.writeContract({ address: contract, functionName, args, value: 0n });
  transactions.push(hash); process.stdout.write(`${label}: ${hash}\n`);
  const { receipt, tx } = await finalized(client, hash); const rejected = failure(tx, receipt);
  if (expectError) { if (!rejected.includes(expectError)) throw new Error(`${label}: expected ${expectError}, got ${rejected || "success"}`); return hash; }
  if (rejected) throw new Error(`${label}: ${rejected}`); return hash;
}

const version = await read("get_contract_version");
if (version.name !== "RecallRoute" || version.version !== 1 || version.schema !== "sealed-two-source-v1") throw new Error("Contract handshake failed");
const runTag = String(Date.now());

async function runScenario(name, serial, secondSource, expected, sourceFailure = false) {
  const id = `RR48-${name}-${runTag}`; const close = Math.floor(Date.now()/1000) + 7200;
  await write(`${name}.create`, "create_case", [id, ownerAccount.address, "RR-48", "BAT-XR48", serial, "NS-24-Q2", "2026-03-14", "DEMO-EU", 0, close]);
  await write(`${name}.oem`, "add_notice", [id, "0", "OEM", origin, oem.url, oem.sha, oem.bytes, oem.citation]);
  const selected = sourceFailure ? { url: `${base}/missing-regulator.txt`, sha: "0".repeat(64), bytes: 1, citation: "MISSING-REGULATOR-CITATION" } : secondSource;
  await write(`${name}.regulator`, "add_notice", [id, "1", "REGULATOR", origin, selected.url, selected.sha, selected.bytes, selected.citation]);
  await write(`${name}.seal`, "seal_case", [id]); const sealed = await read("get_case", [id]);
  if (!/^[0-9a-f]{64}$/.test(sealed.dossier_digest)) throw new Error(`${name}: invalid digest`);
  if (name === "AFFECTED") await write(`${name}.wrongDigest`, "accept_case", [id, "0".repeat(64)], owner, "DOSSIER_DIGEST_MISMATCH");
  await write(`${name}.accept`, "accept_case", [id, sealed.dossier_digest], owner);
  if (sourceFailure) {
    const before = JSON.stringify(await read("get_case", [id]));
    await write(`${name}.assessFailure`, "assess_case", [id], authority, "REGULATOR_SOURCE_UNAVAILABLE");
    if (JSON.stringify(await read("get_case", [id])) !== before) throw new Error(`${name}: failed assessment mutated state`);
    return { id, rollback: true };
  }
  await write(`${name}.assess`, "assess_case", [id]); await write(`${name}.finalize`, "finalize_case", [id]);
  const final = await read("get_case", [id]);
  if (final.status !== "FINALIZED" || final.route !== expected) throw new Error(`${name}: expected ${expected}, got ${final.status}/${final.route}`);
  return { id, route: final.route, remedy: final.remedy, immediate_action: final.immediate_action };
}

const scenarios = {
  affected: await runScenario("AFFECTED", "XR48001482", regulator, "AFFECTED"),
  notAffected: await runScenario("NOTAFFECTED", "XR48009999", regulator, "NOT_AFFECTED"),
  conflict: await runScenario("CONFLICT", "XR48001482", conflict, "MANUAL_REVIEW"),
  sourceFailure: await runScenario("SOURCEFAIL", "XR48001482", regulator, "MANUAL_REVIEW", true),
};
process.stdout.write(`LIVE_SUITE_COMPLETE ${JSON.stringify({ contract, commit, authority: authorityAccount.address, owner: ownerAccount.address, scenarios, transactions }, null, 2)}\n`);
