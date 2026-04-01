const state = {
  authToken: localStorage.getItem("ticketpilot_token"),
  currentUser: null,
  tickets: [],
  approvals: [],
  selectedTicketId: null,
  selectedRunId: null,
  latestRunId: null,
  metrics: null,
};

const ticketListEl = document.getElementById("ticket-list");
const approvalListEl = document.getElementById("approval-list");
const ticketDetailEl = document.getElementById("ticket-detail");
const runDetailEl = document.getElementById("run-detail");
const ticketFormEl = document.getElementById("ticket-form");
const refreshAllBtn = document.getElementById("refresh-all-btn");
const seedOrderBtn = document.getElementById("seed-order-btn");
const seedRefundBtn = document.getElementById("seed-refund-btn");
const loginFormEl = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const authStatusLabelEl = document.getElementById("auth-status-label");
const currentUserCardEl = document.getElementById("current-user-card");
const roleSummaryEl = document.getElementById("role-summary");
const roleCapabilityLabelEl = document.getElementById("role-capability-label");
const metricsStatusLabelEl = document.getElementById("metrics-status-label");
const createTicketBtn = document.getElementById("create-ticket-btn");

function formatDate(value) {
  if (!value) return "无";
  return new Date(value).toLocaleString("zh-CN");
}

function statusClass(status) {
  return `status-${String(status).replace(/\s+/g, "_").toLowerCase()}`;
}

function getStatusText(status) {
  const map = {
    pending: "待处理",
    queued: "已入队",
    running: "运行中",
    completed: "已完成",
    resolved: "已解决",
    waiting_approval: "待审批",
    approved: "已通过",
    rejected: "已拒绝",
    failed: "失败",
    reviewer: "审批员",
    admin: "管理员",
    user: "分析员",
  };
  return map[status] || status;
}

function getChannelText(channel) {
  const map = {
    web: "网页",
    email: "邮件",
    slack: "Slack",
  };
  return map[channel] || channel;
}

function getAuthHeaders() {
  if (!state.authToken) {
    return {};
  }
  return { Authorization: `Bearer ${state.authToken}` };
}

async function api(path, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(typeof payload === "string" ? payload : payload.detail || `请求失败: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isReviewerLike() {
  return state.currentUser && ["reviewer", "admin"].includes(state.currentUser.role);
}

function setSignedOutState() {
  authStatusLabelEl.textContent = "未登录";
  currentUserCardEl.className = "user-card empty-state";
  currentUserCardEl.textContent = "登录后可以创建工单、运行 Agent、查看指标，并按角色执行审批。";
  roleCapabilityLabelEl.textContent = "访客";
  roleSummaryEl.className = "detail-card role-summary empty-state";
  roleSummaryEl.textContent = "访客只能看到落地页，真正的数据访问和操作需要先登录。";
  metricsStatusLabelEl.textContent = "登录后加载";
  createTicketBtn.disabled = true;
}

function renderCurrentUser() {
  if (!state.currentUser) {
    setSignedOutState();
    return;
  }

  authStatusLabelEl.textContent = getStatusText(state.currentUser.role);
  currentUserCardEl.className = "user-card";
  currentUserCardEl.innerHTML = `
    <div class="detail-key">当前会话</div>
    <div class="detail-value">${escapeHtml(state.currentUser.display_name)}</div>
    <div class="detail-value">${escapeHtml(state.currentUser.email)}</div>
    <div class="detail-value">角色：${escapeHtml(getStatusText(state.currentUser.role))}</div>
  `;
  roleCapabilityLabelEl.textContent = getStatusText(state.currentUser.role);
  roleSummaryEl.className = "detail-card role-summary";
  roleSummaryEl.innerHTML = `
    <div class="detail-grid">
      <div class="detail-section">
        <div class="detail-key">角色说明</div>
        <div class="detail-value">${escapeHtml(buildRoleSummary(state.currentUser.role))}</div>
      </div>
      <div class="detail-section">
        <div class="detail-key">审批权限</div>
        <div class="detail-value">${isReviewerLike() ? "可以通过或拒绝退款等高风险操作。" : "可以查看审批队列，但不能实际审批。"}</div>
      </div>
    </div>
  `;
  metricsStatusLabelEl.textContent = "实时";
  createTicketBtn.disabled = false;
}

function buildRoleSummary(role) {
  if (role === "admin") return "管理员可以创建工单、运行 Agent、查看指标，并执行高风险审批。";
  if (role === "reviewer") return "审批员可以创建工单、运行 Agent、查看指标，并处理审批队列。";
  return "分析员可以创建工单和运行工作流，但没有高风险审批权限。";
}

function renderMetrics() {
  const metrics = state.metrics;
  if (!metrics) {
    document.getElementById("resolved-ticket-count").textContent = "0";
    document.getElementById("run-count").textContent = "0";
    document.getElementById("completed-run-count").textContent = "0";
    document.getElementById("run-completion-rate").textContent = "0%";
    document.getElementById("avg-tool-latency").textContent = "0 ms";
    return;
  }

  document.getElementById("resolved-ticket-count").textContent = String(metrics.resolved_ticket_count);
  document.getElementById("run-count").textContent = String(metrics.run_count);
  document.getElementById("completed-run-count").textContent = String(metrics.completed_run_count);
  document.getElementById("run-completion-rate").textContent = `${Math.round(metrics.run_completion_rate * 100)}%`;
  document.getElementById("avg-tool-latency").textContent = `${metrics.average_tool_latency_ms} ms`;
}

function renderTickets() {
  ticketListEl.innerHTML = "";
  document.getElementById("ticket-count").textContent = String(state.tickets.length);
  document.getElementById("ticket-status-label").textContent = state.currentUser
    ? `已加载 ${state.tickets.length} 条`
    : "需要登录";

  if (!state.currentUser) {
    ticketListEl.innerHTML = `<div class="detail-card empty-state">登录后才能查看和操作工单。</div>`;
    return;
  }

  if (!state.tickets.length) {
    ticketListEl.innerHTML = `<div class="detail-card empty-state">还没有工单，可以先从左侧创建一条。</div>`;
    return;
  }

  const template = document.getElementById("ticket-template");
  for (const ticket of state.tickets) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".ticket-title").textContent = ticket.title;
    const statusEl = node.querySelector(".ticket-status");
    statusEl.textContent = getStatusText(ticket.status);
    statusEl.classList.add(statusClass(ticket.status));
    node.querySelector(".ticket-meta").textContent =
      `#${ticket.id}  |  ${getChannelText(ticket.channel)}  |  ${ticket.category || "未分类"}  |  ${ticket.priority || "未评级"}`;
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
  document.getElementById("approval-status-label").textContent = state.currentUser
    ? pending.length
      ? `待处理 ${pending.length} 条`
      : "暂无待审批"
    : "需要登录";

  if (!state.currentUser) {
    approvalListEl.innerHTML = `<div class="detail-card empty-state">登录后才能查看审批队列。</div>`;
    return;
  }

  if (!state.approvals.length) {
    approvalListEl.innerHTML = `<div class="detail-card empty-state">退款等高风险动作会在这里进入人工审批。</div>`;
    return;
  }

  const template = document.getElementById("approval-template");
  for (const approval of state.approvals) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".approval-title").textContent = `${approval.action_type} | 工单 #${approval.ticket_id}`;
    const statusEl = node.querySelector(".approval-status");
    statusEl.textContent = getStatusText(approval.status);
    statusEl.classList.add(statusClass(approval.status));
    node.querySelector(".approval-meta").textContent =
      `审批 #${approval.id}  |  运行 #${approval.run_id}  |  ${formatDate(approval.created_at)}`;

    const approveBtn = node.querySelector(".approve-btn");
    const rejectBtn = node.querySelector(".reject-btn");

    if (approval.status !== "pending" || !isReviewerLike()) {
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
    document.getElementById("selected-ticket-label").textContent = "未选择";
    ticketDetailEl.className = "detail-card empty-state";
    ticketDetailEl.textContent = state.currentUser
      ? "点击一条工单后，可以查看工单内容、状态和处理结果。"
      : "登录后才能查看工单详情。";
    return;
  }

  document.getElementById("selected-ticket-label").textContent = `工单 #${ticket.id}`;
  ticketDetailEl.className = "detail-card";
  ticketDetailEl.innerHTML = `
    <div class="detail-grid">
      <div class="detail-section">
        <div class="detail-key">标题</div>
        <div class="detail-value">${escapeHtml(ticket.title)}</div>
      </div>
      <div class="detail-section">
        <div class="detail-key">状态</div>
        <div class="detail-value">${escapeHtml(getStatusText(ticket.status))} | ${escapeHtml(ticket.category || "未分类")} | ${escapeHtml(ticket.priority || "未评级")}</div>
      </div>
      <div class="detail-section">
        <div class="detail-key">内容</div>
        <pre>${escapeHtml(ticket.content)}</pre>
      </div>
      <div class="detail-section">
        <div class="detail-key">时间线</div>
        <div class="detail-value">创建时间：${escapeHtml(formatDate(ticket.created_at))}</div>
        <div class="detail-value">更新时间：${escapeHtml(formatDate(ticket.updated_at))}</div>
      </div>
    </div>
  `;
}

function renderRunDetail(payload) {
  if (!payload) {
    document.getElementById("run-status-label").textContent = "未选择运行";
    runDetailEl.className = "detail-card empty-state";
    runDetailEl.textContent = state.currentUser
      ? "启动 Agent 后，这里会展示工具调用和审批记录。"
      : "登录后才能查看运行详情。";
    return;
  }

  const { run, tool_calls: toolCalls, approvals } = payload;
  document.getElementById("run-status-label").textContent = `运行 #${run.id} | ${getStatusText(run.status)}`;
  document.getElementById("latest-run-label").textContent = `#${run.id}`;
  runDetailEl.className = "detail-card";
  runDetailEl.innerHTML = `
    <div class="detail-grid">
      <div class="detail-section">
        <div class="detail-key">运行概览</div>
        <div class="detail-value">状态：${escapeHtml(getStatusText(run.status))}</div>
        <div class="detail-value">模型：${escapeHtml(run.model)}</div>
        <div class="detail-value">Trace ID：${escapeHtml(run.trace_id || "无")}</div>
      </div>
      <div class="detail-section">
        <div class="detail-key">工具调用（${toolCalls.length}）</div>
        <pre>${escapeHtml(JSON.stringify(toolCalls, null, 2))}</pre>
      </div>
      <div class="detail-section">
        <div class="detail-key">审批记录（${approvals.length}）</div>
        <pre>${escapeHtml(JSON.stringify(approvals, null, 2))}</pre>
      </div>
    </div>
  `;
}

async function fetchCurrentUser() {
  if (!state.authToken) {
    state.currentUser = null;
    renderCurrentUser();
    return;
  }

  try {
    state.currentUser = await api("/auth/me");
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      showToast("登录已过期，请重新登录。");
      return;
    }
    throw error;
  }
  renderCurrentUser();
}

async function fetchTickets() {
  if (!state.currentUser) {
    state.tickets = [];
    renderTickets();
    return;
  }
  state.tickets = await api("/tickets");
  renderTickets();
  const selected = state.tickets.find((item) => item.id === state.selectedTicketId);
  renderTicketDetail(selected);
}

async function fetchApprovals() {
  if (!state.currentUser) {
    state.approvals = [];
    renderApprovals();
    return;
  }
  state.approvals = await api("/approvals");
  renderApprovals();
}

async function fetchMetrics() {
  if (!state.currentUser) {
    state.metrics = null;
    renderMetrics();
    return;
  }
  state.metrics = await api("/metrics/summary");
  renderMetrics();
}

async function fetchRunDetails(runId) {
  state.selectedRunId = runId;
  const payload = await api(`/runs/${runId}/steps`);
  renderRunDetail(payload);
}

async function selectTicket(ticketId) {
  if (!state.currentUser) {
    showToast("请先登录。");
    return;
  }

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
    showToast(`加载运行详情失败：${error.message}`);
  }
}

async function runTicket(ticketId) {
  if (!state.currentUser) {
    showToast("请先登录。");
    return;
  }

  try {
    const run = await api(`/tickets/${ticketId}/run`, { method: "POST" });
    state.latestRunId = run.id;
    showToast(`已启动运行 #${run.id}，对应工单 #${ticketId}`);
    await refreshAll();
    await fetchRunDetails(run.id);
    await selectTicket(ticketId);
  } catch (error) {
    showToast(`启动运行失败：${error.message}`);
  }
}

async function reviewApproval(approvalId, action) {
  if (!isReviewerLike()) {
    showToast("只有审批员或管理员可以执行审批。");
    return;
  }

  try {
    await api(`/approvals/${approvalId}/${action}`, {
      method: "POST",
      body: JSON.stringify({
        comment: action === "approve" ? "由控制台执行通过" : "由控制台执行拒绝",
      }),
    });
    showToast(`审批 #${approvalId} 已${action === "approve" ? "通过" : "拒绝"}`);
    await refreshAll();
  } catch (error) {
    showToast(`审批失败：${error.message}`);
  }
}

async function createTicket(payload) {
  if (!state.currentUser) {
    showToast("请先登录。");
    return;
  }

  const ticket = await api("/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.selectedTicketId = ticket.id;
  showToast(`已创建工单 #${ticket.id}`);
  await refreshAll();
  renderTicketDetail(ticket);
}

async function refreshAll() {
  if (!state.currentUser) {
    renderTickets();
    renderApprovals();
    renderMetrics();
    renderTicketDetail(null);
    renderRunDetail(null);
    return;
  }

  await Promise.all([fetchTickets(), fetchApprovals(), fetchMetrics()]);
  if (state.selectedTicketId) {
    await selectTicket(state.selectedTicketId);
  } else if (state.tickets.length) {
    await selectTicket(state.tickets[0].id);
  }
}

function clearSession() {
  state.authToken = null;
  state.currentUser = null;
  state.metrics = null;
  localStorage.removeItem("ticketpilot_token");
  renderCurrentUser();
}

async function signIn(email, password) {
  const payload = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  state.authToken = payload.access_token;
  state.currentUser = payload.user;
  localStorage.setItem("ticketpilot_token", state.authToken);
  renderCurrentUser();
  await refreshAll();
  showToast(`已登录：${payload.user.display_name}`);
}

loginFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginFormEl);
  try {
    await signIn(formData.get("email"), formData.get("password"));
  } catch (error) {
    showToast(`登录失败：${error.message}`);
  }
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  showToast("已退出登录");
  refreshAll();
});

document.querySelectorAll(".preset-login-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("login-email").value = button.dataset.email;
    document.getElementById("login-password").value = button.dataset.password;
  });
});

ticketFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(ticketFormEl);
  try {
    await createTicket({
      title: formData.get("title"),
      channel: formData.get("channel"),
      content: formData.get("content"),
    });
    ticketFormEl.reset();
  } catch (error) {
    showToast(`创建工单失败：${error.message}`);
  }
});

refreshAllBtn.addEventListener("click", refreshAll);

seedOrderBtn.addEventListener("click", async () => {
  await createTicket({
    title: "我的订单什么时候到？",
    content: "我的订单 123456 还没有收到，请帮我查询一下物流状态。",
    channel: "web",
  });
});

seedRefundBtn.addEventListener("click", async () => {
  await createTicket({
    title: "商品损坏，申请退款",
    content: "订单 987654 到货后发现商品损坏，我想申请退款。",
    channel: "web",
  });
});

async function init() {
  setSignedOutState();
  try {
    if (state.authToken) {
      await fetchCurrentUser();
      await refreshAll();
    } else {
      renderTickets();
      renderApprovals();
      renderMetrics();
      renderTicketDetail(null);
      renderRunDetail(null);
    }
  } catch (error) {
    showToast(`初始化失败：${error.message}`);
  }
}

init();
