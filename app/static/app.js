const state = {
  tickets: [],
  approvals: [],
  selectedTicketId: null,
  selectedRunId: null,
  latestRunId: null,
};

const ticketListEl = document.getElementById("ticket-list");
const approvalListEl = document.getElementById("approval-list");
const ticketDetailEl = document.getElementById("ticket-detail");
const runDetailEl = document.getElementById("run-detail");
const ticketFormEl = document.getElementById("ticket-form");
const refreshAllBtn = document.getElementById("refresh-all-btn");
const seedOrderBtn = document.getElementById("seed-order-btn");
const seedRefundBtn = document.getElementById("seed-refund-btn");

function formatDate(value) {
  if (!value) return "n/a";
  return new Date(value).toLocaleString();
}

function statusClass(status) {
  return `status-${String(status).replace(/\s+/g, "_").toLowerCase()}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function truncate(text, maxLength = 120) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function renderTickets() {
  ticketListEl.innerHTML = "";
  document.getElementById("ticket-count").textContent = String(state.tickets.length);
  document.getElementById("ticket-status-label").textContent = `${state.tickets.length} loaded`;

  if (!state.tickets.length) {
    ticketListEl.innerHTML = `<div class="detail-card empty-state">No tickets yet. Create one from the left panel.</div>`;
    return;
  }

  const template = document.getElementById("ticket-template");
  for (const ticket of state.tickets) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".ticket-title").textContent = ticket.title;
    const statusEl = node.querySelector(".ticket-status");
    statusEl.textContent = ticket.status;
    statusEl.classList.add(statusClass(ticket.status));
    node.querySelector(".ticket-meta").textContent =
      `#${ticket.id}  |  ${ticket.channel}  |  ${ticket.category || "uncategorized"}  |  ${ticket.priority || "unranked"}`;
    node.querySelector(".ticket-preview").textContent = truncate(ticket.content, 140);

    node.querySelector(".view-ticket-btn").addEventListener("click", () => selectTicket(ticket.id));
    node.querySelector(".run-ticket-btn").addEventListener("click", () => runTicket(ticket.id));
    ticketListEl.appendChild(node);
  }
}

function renderApprovals() {
  approvalListEl.innerHTML = "";
  const pending = state.approvals.filter((item) => item.status === "pending");
  document.getElementById("approval-count").textContent = String(pending.length);
  document.getElementById("approval-status-label").textContent = pending.length
    ? `${pending.length} pending`
    : "No pending approvals";

  if (!state.approvals.length) {
    approvalListEl.innerHTML = `<div class="detail-card empty-state">Refund-like actions will appear here for approval.</div>`;
    return;
  }

  const template = document.getElementById("approval-template");
  for (const approval of state.approvals) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".approval-title").textContent = `${approval.action_type} for ticket #${approval.ticket_id}`;
    const statusEl = node.querySelector(".approval-status");
    statusEl.textContent = approval.status;
    statusEl.classList.add(statusClass(approval.status));
    node.querySelector(".approval-meta").textContent =
      `Approval #${approval.id}  |  Run #${approval.run_id}  |  ${formatDate(approval.created_at)}`;

    const approveBtn = node.querySelector(".approve-btn");
    const rejectBtn = node.querySelector(".reject-btn");

    if (approval.status !== "pending") {
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
    } else {
      approveBtn.addEventListener("click", () => reviewApproval(approval.id, "approve"));
      rejectBtn.addEventListener("click", () => reviewApproval(approval.id, "reject"));
    }

    approvalListEl.appendChild(node);
  }
}

function renderTicketDetail(ticket) {
  if (!ticket) {
    document.getElementById("selected-ticket-label").textContent = "None";
    ticketDetailEl.className = "detail-card empty-state";
    ticketDetailEl.textContent = "Select a ticket to inspect run history and actions.";
    return;
  }

  document.getElementById("selected-ticket-label").textContent = `Ticket #${ticket.id}`;
  ticketDetailEl.className = "detail-card";
  ticketDetailEl.innerHTML = `
    <div class="detail-grid">
      <div class="detail-section">
        <div class="detail-key">Headline</div>
        <div class="detail-value">${escapeHtml(ticket.title)}</div>
      </div>
      <div class="detail-section">
        <div class="detail-key">Status</div>
        <div class="detail-value">${escapeHtml(ticket.status)} | ${escapeHtml(ticket.category || "uncategorized")} | ${escapeHtml(ticket.priority || "unranked")}</div>
      </div>
      <div class="detail-section">
        <div class="detail-key">Content</div>
        <pre>${escapeHtml(ticket.content)}</pre>
      </div>
      <div class="detail-section">
        <div class="detail-key">Timeline</div>
        <div class="detail-value">Created ${escapeHtml(formatDate(ticket.created_at))}</div>
        <div class="detail-value">Updated ${escapeHtml(formatDate(ticket.updated_at))}</div>
      </div>
    </div>
  `;
}

function renderRunDetail(payload) {
  if (!payload) {
    document.getElementById("run-status-label").textContent = "No run selected";
    runDetailEl.className = "detail-card empty-state";
    runDetailEl.textContent = "Run details will appear here after you start a ticket run.";
    return;
  }

  const { run, tool_calls: toolCalls, approvals } = payload;
  document.getElementById("run-status-label").textContent = `Run #${run.id} | ${run.status}`;
  document.getElementById("latest-run-label").textContent = `#${run.id}`;
  runDetailEl.className = "detail-card";
  runDetailEl.innerHTML = `
    <div class="detail-grid">
      <div class="detail-section">
        <div class="detail-key">Run Snapshot</div>
        <div class="detail-value">Status: ${escapeHtml(run.status)}</div>
        <div class="detail-value">Model: ${escapeHtml(run.model)}</div>
        <div class="detail-value">Trace: ${escapeHtml(run.trace_id || "n/a")}</div>
      </div>
      <div class="detail-section">
        <div class="detail-key">Tool Calls (${toolCalls.length})</div>
        <pre>${escapeHtml(JSON.stringify(toolCalls, null, 2))}</pre>
      </div>
      <div class="detail-section">
        <div class="detail-key">Approvals (${approvals.length})</div>
        <pre>${escapeHtml(JSON.stringify(approvals, null, 2))}</pre>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchTickets() {
  state.tickets = await api("/tickets");
  renderTickets();
  const selected = state.tickets.find((item) => item.id === state.selectedTicketId);
  renderTicketDetail(selected);
}

async function fetchApprovals() {
  state.approvals = await api("/approvals");
  renderApprovals();
}

async function fetchRunDetails(runId) {
  state.selectedRunId = runId;
  const payload = await api(`/runs/${runId}/steps`);
  renderRunDetail(payload);
}

async function selectTicket(ticketId) {
  state.selectedTicketId = ticketId;
  const ticket = state.tickets.find((item) => item.id === ticketId);
  renderTicketDetail(ticket);

  try {
    const runs = await api(`/tickets/${ticketId}/runs`);
    if (!runs.length) {
      renderRunDetail(null);
      return;
    }

    const latestRun = runs[0];
    state.latestRunId = latestRun.id;
    await fetchRunDetails(latestRun.id);
  } catch (error) {
    showToast(`Could not load run detail: ${error.message}`);
  }
}

async function runTicket(ticketId) {
  try {
    const run = await api(`/tickets/${ticketId}/run`, { method: "POST" });
    state.latestRunId = run.id;
    showToast(`Run #${run.id} started for ticket #${ticketId}`);
    await refreshAll();
    await fetchRunDetails(run.id);
    await selectTicket(ticketId);
  } catch (error) {
    showToast(`Run failed to start: ${error.message}`);
  }
}

async function reviewApproval(approvalId, action) {
  try {
    await api(`/approvals/${approvalId}/${action}`, {
      method: "POST",
      body: JSON.stringify({
        reviewer_id: 1001,
        comment: action === "approve" ? "Approved from UI console" : "Rejected from UI console",
      }),
    });
    showToast(`Approval #${approvalId} ${action}d`);
    await refreshAll();
  } catch (error) {
    showToast(`Approval failed: ${error.message}`);
  }
}

async function createTicket(payload) {
  const ticket = await api("/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.selectedTicketId = ticket.id;
  showToast(`Created ticket #${ticket.id}`);
  await refreshAll();
  renderTicketDetail(ticket);
}

async function refreshAll() {
  await Promise.all([fetchTickets(), fetchApprovals()]);
  if (state.selectedTicketId) {
    await selectTicket(state.selectedTicketId);
  } else if (state.tickets.length) {
    await selectTicket(state.tickets[0].id);
  }
}

ticketFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(ticketFormEl);
  await createTicket({
    title: formData.get("title"),
    channel: formData.get("channel"),
    content: formData.get("content"),
  });
  ticketFormEl.reset();
});

refreshAllBtn.addEventListener("click", refreshAll);

seedOrderBtn.addEventListener("click", async () => {
  await createTicket({
    title: "Where is my order?",
    content: "My order 123456 has not arrived yet. Can you check the tracking status for me?",
    channel: "web",
  });
});

seedRefundBtn.addEventListener("click", async () => {
  await createTicket({
    title: "Refund request for damaged item",
    content: "I want a refund for order 987654 because the item arrived damaged when I opened the box.",
    channel: "web",
  });
});

async function init() {
  try {
    await refreshAll();
  } catch (error) {
    showToast(`Could not load data: ${error.message}`);
  }
}

init();
