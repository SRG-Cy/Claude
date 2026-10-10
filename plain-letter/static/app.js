// Plain Letter frontend. All model output is inserted with textContent, never innerHTML.

const MODES = {
  letter: { label: "Paste the letter, notice, bill or email here" },
  terms: { label: "Paste the terms and conditions or privacy policy here" },
  asks: { label: "Paste what the website or app is asking you for (form fields, permissions, cookie banner, message)" },
};

const EXAMPLES = {
  letter: `CITY POWER DISTRIBUTION LTD.
NOTICE OF DISCONNECTION U/S 56(1) OF THE ELECTRICITY ACT, 2003

Consumer No.: 1029-4471
Dear Consumer,

This is to inform you that an amount of Rs. 4,860/- towards electricity charges for the billing period Aug–Sep remains outstanding despite reminders. You are hereby called upon to remit the arrears within 15 (fifteen) days from the date of this notice, failing which the supply to your premises shall be disconnected without further intimation. A late payment surcharge of Rs. 250/- shall be levied in the subsequent bill. Reconnection, if sought, shall be subject to payment of all dues along with reconnection charges of Rs. 500/-.

Any grievance regarding the bill may be submitted to the Customer Care Office within 10 days along with supporting documents.

Payments may be made through the official portal, mobile application or authorised collection centres only.

Assistant Engineer (Revenue)`,
  terms: `SNAPSTREAM TERMS OF SERVICE
1. Subscription. Your 7-day free trial converts automatically to an annual subscription at INR 1,499 unless cancelled at least 24 hours before the end of the trial period. Fees are non-refundable, including for partial periods. We may modify pricing upon 30 days' notice.
2. User Content. By uploading content you grant SnapStream a worldwide, royalty-free, sublicensable, perpetual licence to use, reproduce, modify, distribute and display such content in any media, including promotional materials.
3. Data. We collect your name, email, phone number, precise geolocation, device identifiers, viewing activity and, where permitted, your contacts. We may share information with advertising and analytics partners and with any successor entity in the event of a merger or acquisition.
4. Disputes. All disputes shall be resolved by binding individual arbitration. You waive any right to participate in a class action.
5. Changes. We may amend these Terms at any time; continued use constitutes acceptance.
6. Cancellation. Cancel via Settings > Subscription. Uninstalling the app does not cancel your subscription.
7. Your rights. You may request a copy of your data or deletion of your account by contacting privacy@snapstream.example.`,
  asks: `QuickLoan - Get ₹50,000 in 5 minutes! No documents, no credit check!

To continue, please allow:
☐ Full name
☐ Mobile number
☐ PAN card number
☐ Allow access to Contacts
☐ Allow access to Photos & Gallery
☐ Enter the 6-digit OTP sent to your phone to verify your account

[Allow all & get loan]`,
};

const SPEECH_LANG = {
  English: "en-IN", Hindi: "hi-IN", Malayalam: "ml-IN", Tamil: "ta-IN", Telugu: "te-IN",
  Kannada: "kn-IN", Bengali: "bn-IN", Marathi: "mr-IN", Gujarati: "gu-IN", Punjabi: "pa-IN",
  Urdu: "ur-IN", Spanish: "es-ES", French: "fr-FR", Arabic: "ar-SA", Portuguese: "pt-BR",
  "Chinese (Simplified)": "zh-CN",
};

const $ = (sel) => document.querySelector(sel);
const textBox = $("#text");
const statusBox = $("#status");
const resultBox = $("#result");
let mode = "letter";
let lastText = "";
let lastLanguage = "English";

// Small DOM builder: el("div.card.x", {attr}, child, "text", ...)
function el(spec, attrs, ...children) {
  const [tag, ...classes] = spec.split(".");
  const node = document.createElement(tag || "div");
  if (classes.length) node.className = classes.join(" ");
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node)) {
    children.unshift(attrs);
  } else if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "on") for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
      else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

const list = (v) => (Array.isArray(v) ? v.filter((x) => x && String(x).trim()) : []);
const str = (v) => (v == null ? "" : String(v));

function setStatus(message, isError = false, busy = false) {
  statusBox.className = "status" + (isError ? " error" : "");
  statusBox.replaceChildren(busy ? el("span.spinner") : "", message);
}

// ---------- tabs, examples, file input ----------

document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab);
    });
    $("#text-label").textContent = MODES[mode].label;
    resultBox.hidden = true;
    setStatus("");
  })
);

$("#example").addEventListener("click", () => {
  textBox.value = EXAMPLES[mode];
  textBox.focus();
});

$("#file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) textBox.value = await file.text();
  e.target.value = "";
});

// ---------- API ----------

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error (${res.status}). Please try again.`);
  }
  if (!res.ok) throw new Error(data.error || `Server error (${res.status}).`);
  return data;
}

$("#analyze").addEventListener("click", async () => {
  const text = textBox.value.trim();
  if (!text) {
    setStatus("Please paste some text first, or press “Try an example”.", true);
    textBox.focus();
    return;
  }
  const btn = $("#analyze");
  btn.disabled = true;
  resultBox.hidden = true;
  setStatus("Reading it carefully… this can take 10–30 seconds.", false, true);
  lastText = text;
  lastLanguage = $("#language").value;
  try {
    const data = await post("/api/analyze", { mode, text, language: lastLanguage });
    setStatus(data.demo ? "Showing a sample answer (demo mode)." : "");
    render(data.result);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// ---------- rendering ----------

function render(r) {
  const renderer = { letter: renderLetter, terms: renderTerms, asks: renderAsks }[mode];
  resultBox.replaceChildren(...renderer(r));
  resultBox.hidden = false;
  resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
}

function summaryCard(r, level, pillText, extra) {
  const spoken = [r.title, r.summary, r.verdict].filter(Boolean).join(". ");
  return el(`section.card.summary-card.${level || ""}`, null,
    el("div.summary-head", null,
      el("h2", null, str(r.title) || "Summary"),
      level ? el(`span.pill.${level}`, null, pillText) : null),
    r.sender ? el("p.sender", null, "From: ", str(r.sender)) : null,
    el("p.summary", null, str(r.summary)),
    extra,
    el("div.toolbar", null,
      el("button.btn.small", { type: "button", on: { click: () => speak(spoken) } }, "🔊 Read aloud"),
      el("button.btn.small", { type: "button", on: { click: (e) => copy(plainTextReport(r), e.target) } }, "📋 Copy summary"))
  );
}

function section(icon, title, body, cls = "") {
  if (!body || (Array.isArray(body) && !body.length)) return null;
  return el(`section.card.section${cls ? "." + cls : ""}`, null, el("h3", null, icon, " ", title), body);
}

const bullets = (items) => (list(items).length ? el("ul", null, list(items).map((i) => el("li", null, str(i)))) : null);

function checklist(items) {
  if (!list(items).length) return null;
  return el("ul.checklist", null,
    list(items).map((item) => el("li", null, el("label", null, el("input", { type: "checkbox" }), el("span", null, str(item))))));
}

function renderLetter(r) {
  const urgency = ["high", "medium", "low"].includes(r.urgency) ? r.urgency : null;
  const deadlines = list(r.deadlines).filter((d) => d.what || d.date_text);
  const money = list(r.money).filter((m) => m.amount);
  return [
    summaryCard(r, urgency, urgency && `${urgency} urgency`),
    el("div.grid", null,
      section("⏰", "Deadlines", deadlines.length ? el("div", null, deadlines.map(deadlineRow)) : null),
      section("💰", "Money", money.length ? el("div", null, money.map((m) =>
        el("div.money", null,
          el("div", null, str(m.what), m.due ? el("small", null, "Due: ", str(m.due)) : null),
          el("b", null, str(m.amount))))) : null)),
    el("div.grid", null,
      section("✅", "What to do", checklist(r.actions)),
      section("🗂️", "Documents you need", checklist(r.documents))),
    section("⚠️", "Be careful", bullets(r.red_flags), "flags"),
    replyCard(list(r.reply_options)),
  ].filter(Boolean);
}

function deadlineRow(d) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(str(d.date)) ? d.date : null;
  let badge;
  if (iso) {
    const today = new Date(new Date().toDateString());
    const days = Math.round((new Date(iso + "T00:00:00") - today) / 86400000);
    const cls = days < 0 ? "past" : days <= 7 ? "soon" : "";
    const big = days < 0 ? "Passed" : days === 0 ? "Today" : days;
    const small = days < 0 ? `${-days} days ago` : days === 0 ? "" : days === 1 ? "day left" : "days left";
    badge = el(`div.countdown${cls ? "." + cls : ""}`, null, String(big), small ? el("small", null, small) : null);
  } else {
    badge = el("div.countdown", null, "📅", el("small", null, "see text"));
  }
  return el("div.deadline", null, badge,
    el("div.deadline-body", null, el("div", null, str(d.what)),
      el("small", null, iso ? new Date(iso + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "medium" }) : str(d.date_text))),
    iso ? el("button.btn.small", { type: "button", title: "Download a calendar reminder", on: { click: () => downloadIcs(d, iso) } }, "＋ Calendar") : null);
}

function renderTerms(r) {
  const score = Math.max(1, Math.min(10, parseInt(r.fairness_score, 10) || 5));
  const level = score >= 7 ? "low" : score >= 4 ? "medium" : "high";
  const color = { low: "var(--good)", medium: "var(--warn)", high: "var(--bad)" }[level];
  const scoreView = el("div", null,
    el("div.score", null,
      el("span.score-num", { style: `color:${color}` }, `${score}/10`),
      el("div.score-bar", null, el("div.score-fill", { style: `width:${score * 10}%;background:${color}` }))),
    el("p", null, el("b", null, str(r.verdict))));
  return [
    summaryCard(r, level, `Fairness ${score}/10`, scoreView),
    section("⚠️", "Watch out for", bullets(r.red_flags), "flags"),
    section("✍️", "What you're agreeing to", bullets(r.you_agree_to)),
    el("div.grid", null,
      section("👁️", "Data they collect", bullets(r.data_collected)),
      section("🤝", "Who they share it with", bullets(r.data_shared_with))),
    el("div.grid", null,
      section("💳", "Money, trials & renewal", bullets(r.money_and_renewal)),
      section("🚪", "How to cancel", r.how_to_cancel ? el("p", { style: "margin:0" }, str(r.how_to_cancel)) : null)),
    section("🛡️", "Your rights", bullets(r.your_rights)),
  ].filter(Boolean);
}

function renderAsks(r) {
  const risk = ["high", "medium", "low"].includes(r.overall_risk) ? r.overall_risk : null;
  const order = { avoid: 0, optional: 1, needed: 2 };
  const items = list(r.items).filter((i) => i.item)
    .sort((a, b) => (order[a.verdict] ?? 1) - (order[b.verdict] ?? 1));
  const labels = { needed: "OK to share", optional: "Optional", avoid: "Don't share" };
  const itemView = items.length ? el("div", null, items.map((i) => {
    const v = labels[i.verdict] ? i.verdict : "optional";
    return el(`div.ask-item.${v}`, null,
      el("div.ask-head", null, el("b", null, str(i.item)), el(`span.pill.${v}`, null, labels[v])),
      el("dl", null,
        i.why_they_ask ? [el("dt", null, "Why they ask"), el("dd", null, str(i.why_they_ask))] : null,
        i.risk ? [el("dt", null, "Risk"), el("dd", null, str(i.risk))] : null,
        i.tip ? [el("dt", null, "What to do"), el("dd", null, el("b", null, str(i.tip)))] : null));
  })) : null;
  return [
    summaryCard(r, risk, risk && `${risk} risk`),
    section("⚠️", "Warning signs", bullets(r.red_flags), "flags"),
    section("🔍", "Each thing they ask for", itemView),
    section("💡", "Safer choices", bullets(r.safer_choices)),
  ].filter(Boolean);
}

// ---------- replies (letter mode) ----------

function replyCard(options) {
  const custom = el("input", { type: "text", placeholder: "Or describe your own reply, e.g. ‘Ask for an installment plan’" });
  const name = el("input", { type: "text", placeholder: "Your name (optional)" });
  const out = el("div.reply-out");
  const generate = async (replyType, btn) => {
    if (!replyType.trim()) return custom.focus();
    btn.disabled = true;
    out.replaceChildren(el("span.spinner"), "Writing your reply…");
    try {
      const data = await post("/api/reply", {
        text: lastText, language: lastLanguage, reply_type: replyType, name: name.value.trim(),
      });
      const subject = str(data.result.subject);
      const body = str(data.result.body);
      const area = el("textarea", { rows: 12 });
      area.value = body;
      out.replaceChildren(
        subject ? el("div.reply-subject", null, "Subject: ", subject) : "",
        area,
        el("div.toolbar", { style: "margin-top:8px" },
          el("button.btn.small", { type: "button", on: { click: (e) => copy(`${subject ? "Subject: " + subject + "\n\n" : ""}${area.value}`, e.target) } }, "📋 Copy reply"),
          el("a.btn.small", { href: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` }, "✉️ Open in email")));
    } catch (err) {
      out.replaceChildren(el("p.status.error", null, err.message));
    } finally {
      btn.disabled = false;
    }
  };
  return el("section.card.section", null,
    el("h3", null, "✍️ Draft a reply"),
    el("div.reply-options", null, options.map((o) =>
      el("button.btn.small", { type: "button", on: { click: (e) => generate(str(o), e.target) } }, str(o)))),
    el("div.reply-row", null, custom, name,
      el("button.btn.primary.small", { type: "button", on: { click: (e) => generate(custom.value, e.target) } }, "Write reply")),
    out);
}

// ---------- helpers ----------

function speak(text) {
  if (!("speechSynthesis" in window)) return setStatus("Read aloud isn't supported in this browser.", true);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH_LANG[lastLanguage] || "en-IN";
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = "✓ Copied";
    setTimeout(() => (btn.textContent = old), 1500);
  } catch {
    setStatus("Couldn't copy automatically. Select the text and copy it by hand.", true);
  }
}

function plainTextReport(r) {
  const lines = [str(r.title), "", str(r.summary)];
  if (r.verdict) lines.push("", str(r.verdict));
  const add = (title, items) => {
    if (list(items).length) lines.push("", title + ":", ...list(items).map((i) => "- " + i));
  };
  add("Deadlines", list(r.deadlines).map((d) => `${str(d.what)} (${str(d.date || d.date_text)})`));
  add("Money", list(r.money).map((m) => `${str(m.amount)}: ${str(m.what)}`));
  add("What to do", r.actions);
  add("Documents", r.documents);
  add("You agree to", r.you_agree_to);
  add("Data collected", r.data_collected);
  add("Shared with", r.data_shared_with);
  add("Money & renewal", r.money_and_renewal);
  if (r.how_to_cancel) lines.push("", "How to cancel: " + r.how_to_cancel);
  add("They ask for", list(r.items).map((i) => `${str(i.item)}: ${str(i.verdict)}. ${str(i.tip)}`));
  add("Safer choices", r.safer_choices);
  add("Be careful", r.red_flags);
  lines.push("", "Explained by Plain Letter. Not legal advice.");
  return lines.join("\n");
}

function downloadIcs(d, iso) {
  const day = iso.replace(/-/g, "");
  const next = new Date(iso + "T00:00:00");
  next.setDate(next.getDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, "");
  const esc = (s) => str(s).replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Plain Letter//EN", "BEGIN:VEVENT",
    `UID:${Date.now()}@plainletter`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc("Deadline: " + str(d.what))}`, `DESCRIPTION:${esc(str(d.date_text))}`,
    "BEGIN:VALARM", "TRIGGER:-P2D", "ACTION:DISPLAY", `DESCRIPTION:${esc(str(d.what))}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = el("a", { href: URL.createObjectURL(new Blob([ics], { type: "text/calendar" })), download: "deadline.ics" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
