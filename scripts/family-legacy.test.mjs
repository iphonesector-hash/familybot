import assert from "node:assert/strict";

function normalizePersian(input) {
  return String(input || "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f\u200e]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function parseVisibility(value) {
  return ["family", "close_family", "private", "admins"].includes(value) ? value : "family";
}
function canSeeRecord(actor, record) {
  const owner = record.ownerId && record.ownerId === actor.memberId;
  const related = Boolean(record.relatedMemberIds?.includes(actor.memberId));
  if (record.moderation_status === "archived" && !actor.isAdmin && !owner) return false;
  if (record.moderation_status === "rejected" && !actor.isAdmin && !owner) return false;
  if (record.moderation_status === "draft" && !owner && !actor.isAdmin) return false;
  if (record.moderation_status === "pending" && !owner && !actor.isAdmin) return false;
  const vis = parseVisibility(record.visibility);
  if (vis === "family") return true;
  if (vis === "private") return owner || actor.isAdmin;
  if (vis === "admins") return actor.isAdmin || owner;
  if (vis === "close_family") {
    if (owner || actor.isAdmin || related) return true;
    return Boolean(actor.closeMemberIds?.includes(record.ownerId || ""));
  }
  return false;
}
function defaultPublishStatus(isAdmin, requested) {
  if (requested === "draft") return "draft";
  if (isAdmin) return requested === "pending" ? "pending" : "approved";
  return "pending";
}
function allowedReactions(targetType) {
  return targetType === "memorial" ? ["❤️", "🕊️"] : ["❤️", "👏", "🥹", "🕊️"];
}
function matchesMonthDay(isoDate, precision, now) {
  if (!isoDate || precision !== "full") return false;
  const m = String(isoDate).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Tehran", month: "2-digit", day: "2-digit"}).formatToParts(now);
  return Number(m[2]) === Number(parts.find((p) => p.type === "month").value) && Number(m[3]) === Number(parts.find((p) => p.type === "day").value);
}
function sanitizePlain(value, max = 8000) {
  return String(value || "").replace(/[<>]/g, "").slice(0, max).trim();
}

assert.equal(normalizePersian("علي و كمال"), "علی و کمال");
assert.equal(normalizePersian("علی‌رضا"), "علی رضا");
assert.ok(normalizePersian("دانشنامه خانواده").includes("دانشنامه"));

const admin = {memberId: "a", isAdmin: true};
const member = {memberId: "m", isAdmin: false, closeMemberIds: ["o"]};
const pending = {visibility: "family", moderation_status: "pending", ownerId: "o"};
assert.equal(canSeeRecord(member, pending), false);
assert.equal(canSeeRecord(admin, pending), true);
assert.equal(canSeeRecord({memberId: "o", isAdmin: false}, pending), true);

const priv = {visibility: "private", moderation_status: "approved", ownerId: "o"};
assert.equal(canSeeRecord(member, priv), false);
assert.equal(canSeeRecord({memberId: "o", isAdmin: false}, priv), true);
assert.equal(canSeeRecord(admin, priv), true);

const close = {visibility: "close_family", moderation_status: "approved", ownerId: "o"};
assert.equal(canSeeRecord(member, close), true);
assert.equal(canSeeRecord({memberId: "x", isAdmin: false, closeMemberIds: []}, close), false);

assert.equal(defaultPublishStatus(false, "approved"), "pending");
assert.equal(defaultPublishStatus(true, "approved"), "approved");
assert.equal(defaultPublishStatus(false, "draft"), "draft");

assert.deepEqual(allowedReactions("memorial"), ["❤️", "🕊️"]);
assert.ok(allowedReactions("article").includes("👏"));
assert.ok(!allowedReactions("memorial").includes("👏"));

const now = new Date("2026-09-05T12:00:00+03:30");
assert.equal(matchesMonthDay("2001-09-05", "full", now), true);
assert.equal(matchesMonthDay("2001-09-05", "year", now), false);
assert.equal(matchesMonthDay("2001", "full", now), false);
assert.equal(matchesMonthDay("2001-08-05", "full", now), false);

function matchesQuery(query, ...parts) {
  const q = normalizePersian(query);
  if (!q) return true;
  return normalizePersian(parts.filter(Boolean).join(" ")).includes(q);
}

function canManageCircle(actor, ownerId) {
  return actor.isAdmin || actor.memberId === ownerId;
}
function canJoinOwnCircle(ownerId, targetId) {
  return Boolean(targetId && targetId !== ownerId);
}

const adminsOnly = {visibility: "admins", moderation_status: "approved", ownerId: "o"};
assert.equal(canSeeRecord(member, adminsOnly), false);
assert.equal(canSeeRecord(admin, adminsOnly), true);
assert.equal(canSeeRecord({memberId: "o", isAdmin: false}, adminsOnly), true);

assert.equal(canSeeRecord({memberId: "b", isAdmin: false, closeMemberIds: ["o"]}, close), true);
assert.equal(canSeeRecord({memberId: "c", isAdmin: false, closeMemberIds: ["someone-else"]}, close), false);

assert.equal(canManageCircle({memberId: "o", isAdmin: false}, "o"), true);
assert.equal(canManageCircle({memberId: "x", isAdmin: false}, "o"), false);
assert.equal(canManageCircle({memberId: "x", isAdmin: true}, "o"), true);
assert.equal(canJoinOwnCircle("o", "o"), false);
assert.equal(canJoinOwnCircle("o", "x"), true);

assert.equal(matchesQuery("دانشنامه", "دانشنامه خانواده"), true);
assert.equal(matchesQuery("علي", "علی و کمال"), true);
assert.equal(matchesQuery("كمال", "علی و کمال"), true);
assert.equal(matchesQuery("علی\u200cرضا", "علی رضا"), true);
assert.equal(matchesQuery("نادر", "دانشنامه خانواده"), false);
assert.equal(matchesQuery("", "هر چیزی"), true);

function searchResultsVisible(actor, rows) {
  return rows.filter((row) => canSeeRecord(actor, row));
}
const catalog = [
  {id: "1", title: "علی", visibility: "private", moderation_status: "approved", ownerId: "o"},
  {id: "2", title: "دانشنامه", visibility: "family", moderation_status: "pending", ownerId: "o"},
  {id: "3", title: "یادبود", visibility: "family", moderation_status: "approved", ownerId: "o"},
];
const visibleToB = searchResultsVisible({memberId: "b", isAdmin: false}, catalog);
assert.deepEqual(visibleToB.map((x) => x.id), ["3"]);
assert.equal(visibleToB.some((x) => x.visibility === "private"), false);
assert.equal(visibleToB.some((x) => x.moderation_status === "pending"), false);

const wedding = new Date("2026-03-21T12:00:00+03:30");
assert.equal(matchesMonthDay("2010-03-21", "full", wedding), true);
assert.equal(matchesMonthDay("2010-03-21", "month", wedding), false);
assert.equal(matchesMonthDay(null, "full", wedding), false);

assert.ok(["family", "close_family", "private", "admins"].includes("close_family"));
assert.ok(["draft", "pending", "approved", "rejected", "archived"].includes("pending"));

import {readFileSync} from "node:fs";
const encyclopedia = readFileSync(new URL("../app/section/legacy/encyclopedia/page.tsx", import.meta.url), "utf8");
assert.equal((encyclopedia.match(/name="visibility"/g) || []).length, 1);
assert.equal((encyclopedia.match(/name="status"/g) || []).length, 0);
assert.equal((encyclopedia.match(/PrivacySelect/g) || []).length, 0);
assert.equal((encyclopedia.match(/StatusSelect/g) || []).length, 0);
assert.ok(encyclopedia.includes("سطح دسترسی"));
assert.ok(encyclopedia.includes("وضعیت انتشار"));
assert.ok(encyclopedia.includes("ذخیره پیش‌نویس"));
assert.ok(encyclopedia.includes("ارسال برای تأیید"));
assert.equal((encyclopedia.match(/همه اعضای خانواده/g) || []).length, 1);


console.log("family-legacy tests passed");
