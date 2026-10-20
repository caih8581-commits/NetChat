// NetChat — no-card Deno Deploy edition.
// The original responsive web UI is embedded below, so one JS file serves
// both the website and its real WebSocket chat backend.

const connections = new Map();
const instanceId = crypto.randomUUID();
const peerCounts = new Map();
const roomBus = new BroadcastChannel("netchat-classroom-room-v1");
let presenceTimer = null;

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function currentCount() {
  const now = Date.now();
  let total = connections.size;
  for (const [id, peer] of peerCounts) {
    if (now - peer.updatedAt < 40000) {
      total += peer.count;
    } else {
      peerCounts.delete(id);
    }
  }
  return total;
}

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    try { socket.send(JSON.stringify(payload)); } catch { /* close will clean up */ }
  }
}

function sendLocal(payload) {
  for (const socket of connections.keys()) sendJson(socket, payload);
}

function notifyCount() {
  sendLocal({ type: "online", count: currentCount() });
}

function publishPresence() {
  if (connections.size > 0) {
    roomBus.postMessage({
      kind: "presence", instance: instanceId,
      count: connections.size, at: Date.now(),
    });
  } else {
    roomBus.postMessage({
      kind: "presence", instance: instanceId, count: 0, at: Date.now(),
    });
  }
  notifyCount();
}

function broadcastToAll(payload) {
  sendLocal(payload);
  roomBus.postMessage({ kind: "relay", instance: instanceId, payload });
}

roomBus.onmessage = (event) => {
  const data = event.data;
  if (!data || data.instance === instanceId) return;
  if (data.kind === "relay") {
    if (data.payload && ["chat", "system"].includes(data.payload.type)) {
      sendLocal(data.payload);
    }
  } else if (data.kind === "presence") {
    peerCounts.set(data.instance, { count: Number(data.count) || 0, updatedAt: Date.now() });
    notifyCount();
  } else if (data.kind === "sync") {
    publishPresence();
  }
};

function connected(socket, username) {
  connections.set(socket, username);
  if (!presenceTimer) presenceTimer = setInterval(publishPresence, 15000);
  publishPresence();
  roomBus.postMessage({ kind: "sync", instance: instanceId });
  broadcastToAll({ type: "system", text: `${username} joined the room.`, time: nowTime() });
  notifyCount();
}

function disconnected(socket) {
  const username = connections.get(socket);
  if (!username) return;
  connections.delete(socket);
  broadcastToAll({ type: "system", text: `${username} left the room.`, time: nowTime() });
  publishPresence();
  if (connections.size === 0 && presenceTimer) {
    clearInterval(presenceTimer);
    presenceTimer = null;
  }
}

const HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>NetChat | Real-time Networking Lab</title>\n<style>\n:root {\n  color-scheme: dark;\n  --bg: #0a1020;\n  --panel: rgba(18, 28, 49, .92);\n  --panel-2: #0d172a;\n  --line: #263753;\n  --muted: #91a1ba;\n  --text: #eaf0fb;\n  --blue: #7094ff;\n  --green: #47d7a0;\n  --amber: #ffc66d;\n  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n}\n* { box-sizing: border-box; }\nbody {\n  margin: 0; min-height: 100vh; color: var(--text);\n  background:\n    radial-gradient(ellipse at 12% 0%, rgba(48, 83, 163, .28), transparent 42%),\n    radial-gradient(ellipse at 100% 20%, rgba(42, 115, 122, .13), transparent 36%),\n    var(--bg);\n}\nbutton, input { font: inherit; }\nbutton { cursor: pointer; }\nbutton:disabled { cursor: not-allowed; opacity: .55; }\n.page { width: min(1240px, 94vw); margin: 0 auto; padding: 30px 0 42px; }\nheader { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-bottom: 26px; }\n.brand { display: flex; align-items: center; gap: 14px; }\n.logo {\n  display: grid; place-items: center; width: 48px; height: 48px; border-radius: 15px;\n  background: linear-gradient(135deg, #527aff, #36b9d5); color: white; font-weight: 850;\n  box-shadow: 0 8px 28px rgba(68, 116, 255, .24);\n}\nh1 { margin: 0 0 4px; font-size: clamp(22px, 3vw, 29px); letter-spacing: -.7px; }\n.subtitle { margin: 0; color: var(--muted); font-size: 13px; }\n.header-right { display: flex; align-items: center; gap: 12px; }\n.pill {\n  display: inline-flex; align-items: center; gap: 9px; padding: 10px 13px;\n  border: 1px solid var(--line); border-radius: 999px; background: rgba(13, 23, 42, .8);\n  color: #cbd6e9; font-size: 12px; white-space: nowrap;\n}\n.dot { width: 8px; height: 8px; border-radius: 50%; background: #70819d; }\n.pill.online .dot { background: var(--green); box-shadow: 0 0 0 4px rgba(71,215,160,.1); }\n.pill.connecting .dot { background: var(--amber); }\n.hero { margin: 0 0 20px; padding: 22px 24px; border: 1px solid var(--line); border-radius: 19px; background: linear-gradient(115deg, rgba(27, 44, 76, .94), rgba(17, 28, 49, .85)); }\n.eyebrow { color: #a7bcff; font-size: 11px; letter-spacing: 1.7px; text-transform: uppercase; font-weight: 750; }\n.hero h2 { margin: 8px 0 7px; font-size: clamp(20px, 2.8vw, 27px); letter-spacing: -.45px; }\n.hero p { max-width: 760px; margin: 0; color: #adbad0; line-height: 1.65; font-size: 13px; }\n.join { padding: 18px 20px; margin-bottom: 20px; }\n.join-row { display: flex; align-items: end; gap: 12px; }\n.field { flex: 1; min-width: 180px; }\nlabel { display: block; margin-bottom: 7px; color: #b7c5dc; font-size: 12px; }\ninput { width: 100%; min-width: 0; padding: 12px 13px; border: 1px solid #30415f; border-radius: 10px; outline: none; background: #0b1528; color: var(--text); }\ninput:focus { border-color: #6f91ff; box-shadow: 0 0 0 3px rgba(111,145,255,.12); }\n.btn { padding: 12px 17px; border: 1px solid transparent; border-radius: 10px; background: #5479f6; color: white; font-weight: 700; font-size: 13px; transition: .15s ease; }\n.btn:hover:not(:disabled) { background: #6889ff; transform: translateY(-1px); }\n.btn.secondary { background: #1b2a44; border-color: #344967; color: #dce7fb; }\n.btn.secondary:hover:not(:disabled) { background: #243958; }\n.helper { margin: 10px 0 0; color: var(--muted); font-size: 11px; line-height: 1.6; }\n.grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(330px, .9fr); gap: 20px; align-items: stretch; }\n.panel { min-width: 0; border: 1px solid var(--line); border-radius: 17px; background: var(--panel); box-shadow: 0 12px 36px rgba(0,0,0,.12); padding: 20px; }\n.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }\n.panel-head h3 { margin: 0; font-size: 15px; letter-spacing: -.1px; }\n.tag { color: #9fb6ff; font-size: 10px; font-weight: 750; letter-spacing: 1.1px; white-space: nowrap; }\n.chat-window { height: 365px; overflow-y: auto; padding: 14px; border: 1px solid #22334f; border-radius: 13px; background: rgba(7, 15, 29, .75); }\n.empty { display: grid; place-items: center; height: 100%; min-height: 140px; text-align: center; color: #71829e; font-size: 13px; line-height: 1.7; }\n.empty strong { display: block; color: #b7c7e2; font-size: 14px; margin-bottom: 5px; }\n.system { margin: 10px 0 13px; text-align: center; color: #8798b5; font-size: 11px; }\n.message { margin: 0 0 15px; }\n.message-meta { display: flex; gap: 9px; align-items: center; margin-bottom: 6px; font-size: 11px; }\n.message-name { color: #a9bdff; font-weight: 750; }\n.message-time { color: #71829e; }\n.message-text { display: block; width: fit-content; max-width: 96%; padding: 10px 12px; border: 1px solid #2b3e5c; border-radius: 5px 12px 12px 12px; background: #172641; color: #e8eef9; overflow-wrap: anywhere; white-space: pre-wrap; font-size: 13px; line-height: 1.55; }\n.message-form { display: flex; gap: 9px; margin-top: 12px; }\n.message-form input { flex: 1; }\n.monitor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }\n.metric { padding: 14px; min-width: 0; border: 1px solid #263854; border-radius: 12px; background: var(--panel-2); }\n.metric-label { color: #91a1ba; font-size: 11px; }\n.metric-value { margin-top: 9px; font-size: 27px; font-weight: 780; letter-spacing: -.8px; }\n.metric-value.small { font-size: 17px; letter-spacing: -.2px; }\n.unit { color: #91a1ba; font-size: 11px; font-weight: 500; letter-spacing: 0; margin-left: 3px; }\n.section-divider { height: 1px; background: #273852; margin: 19px 0; }\n.flow { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: center; gap: 7px; }\n.flow-node { padding: 12px 7px; border: 1px solid #304566; border-radius: 10px; text-align: center; background: #101d33; font-size: 11px; font-weight: 750; }\n.flow-node span { display: block; margin-top: 5px; color: #91a1ba; font-size: 9px; font-weight: 500; }\n.arrow { color: #6f91ff; font-size: 17px; }\n.flow-caption { margin: 10px 0 0; color: #8495af; font-size: 11px; line-height: 1.6; }\n.activity-list { display: flex; flex-direction: column; gap: 8px; max-height: 170px; overflow-y: auto; padding: 0; margin: 0; list-style: none; }\n.activity-item { display: flex; gap: 10px; padding: 9px 10px; border: 1px solid #253651; border-radius: 9px; background: #0e192c; }\n.activity-mark { width: 7px; height: 7px; flex: 0 0 7px; margin-top: 5px; border-radius: 50%; background: #6f91ff; }\n.activity-copy { min-width: 0; }\n.activity-title { font-size: 11px; font-weight: 750; color: #d7e2f5; }\n.activity-detail { margin-top: 3px; color: #8798b3; font-size: 10px; line-height: 1.5; overflow-wrap: anywhere; }\n.footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 17px; color: #71829e; font-size: 10px; line-height: 1.6; }\ncode { color: #c2d0ff; }\n@media (max-width: 850px) { .grid { grid-template-columns: 1fr; } .chat-window { height: 330px; } }\n@media (max-width: 560px) { .page { width: 92vw; padding-top: 20px; } header { align-items: flex-start; flex-direction: column; } .header-right { width: 100%; } .join-row { align-items: stretch; flex-direction: column; } .field { min-width: 0; } .monitor-grid { grid-template-columns: 1fr 1fr; } .panel { padding: 15px; } .hero { padding: 18px; } .footer { flex-direction: column; } }\n</style>\n</head>\n<body>\n<div class=\"page\">\n  <header>\n    <div class=\"brand\">\n      <div class=\"logo\">NC</div>\n      <div>\n        <h1>NetChat</h1>\n        <p class=\"subtitle\">Real-time Networking Lab · WebSocket Communication</p>\n      </div>\n    </div>\n    <div class=\"header-right\">\n      <div class=\"pill\" id=\"statusPill\"><span class=\"dot\"></span><span id=\"statusText\">Not connected</span></div>\n    </div>\n  </header>\n\n  <section class=\"hero\">\n    <div class=\"eyebrow\">Computer Networks · Interactive Project</div>\n    <h2>See real-time communication in action.</h2>\n    <p>Connect multiple browser tabs to one server, exchange messages, and observe connection state, application-level round-trip time (RTT), and server broadcasts in real time.</p>\n  </section>\n\n  <section class=\"panel join\">\n    <div class=\"join-row\">\n      <div class=\"field\">\n        <label for=\"username\">Display name</label>\n        <input id=\"username\" maxlength=\"20\" value=\"Alice\" placeholder=\"Enter a name\">\n      </div>\n      <button class=\"btn\" id=\"connectBtn\">Connect to server</button>\n    </div>\n    <p class=\"helper\">Quick demo: connect this tab as Alice, then open the same address in another tab and connect as Bob. Use different names to distinguish the clients.</p>\n  </section>\n\n  <main class=\"grid\">\n    <section class=\"panel\">\n      <div class=\"panel-head\">\n        <h3>Live chat room</h3><span class=\"tag\">CLIENT ↔ SERVER</span>\n      </div>\n      <div class=\"chat-window\" id=\"chatWindow\" aria-live=\"polite\">\n        <div class=\"empty\" id=\"emptyState\"><div><strong>Your chat starts here</strong>Connect to the server, then open a second tab to test multi-client messaging.</div></div>\n      </div>\n      <form class=\"message-form\" id=\"messageForm\">\n        <input id=\"messageInput\" maxlength=\"500\" placeholder=\"Write a message...\" autocomplete=\"off\" disabled>\n        <button class=\"btn\" id=\"sendBtn\" type=\"submit\" disabled>Send</button>\n      </form>\n    </section>\n\n    <aside class=\"panel\">\n      <div class=\"panel-head\">\n        <h3>Network monitor</h3><span class=\"tag\">LIVE METRICS</span>\n      </div>\n      <div class=\"monitor-grid\">\n        <div class=\"metric\"><div class=\"metric-label\">Online clients</div><div class=\"metric-value\" id=\"onlineCount\">0</div></div>\n        <div class=\"metric\"><div class=\"metric-label\">WebSocket RTT</div><div class=\"metric-value\"><span id=\"rttValue\">—</span><span class=\"unit\">ms</span></div></div>\n        <div class=\"metric\"><div class=\"metric-label\">Chat messages received</div><div class=\"metric-value\" id=\"messageCount\">0</div></div>\n        <div class=\"metric\"><div class=\"metric-label\">Connection</div><div class=\"metric-value small\" id=\"connectionMetric\">Offline</div></div>\n      </div>\n\n      <div class=\"section-divider\"></div>\n      <div class=\"panel-head\"><h3>Communication flow</h3><span class=\"tag\">ARCHITECTURE</span></div>\n      <div class=\"flow\">\n        <div class=\"flow-node\">Client A<span>Browser</span></div><div class=\"arrow\">→</div>\n        <div class=\"flow-node\">Server<span>FastAPI</span></div><div class=\"arrow\">→</div>\n        <div class=\"flow-node\">Client B<span>Browser</span></div>\n      </div>\n      <p class=\"flow-caption\">A client sends a WebSocket message to the server. The server receives it and broadcasts it to connected clients, including the sender.</p>\n\n      <div class=\"section-divider\"></div>\n      <div class=\"panel-head\"><h3>Network activity</h3><span class=\"tag\">RECENT EVENTS</span></div>\n      <ul class=\"activity-list\" id=\"activityList\">\n        <li class=\"activity-item\"><span class=\"activity-mark\"></span><div class=\"activity-copy\"><div class=\"activity-title\">Ready</div><div class=\"activity-detail\">Start a connection to begin the experiment.</div></div></li>\n      </ul>\n    </aside>\n  </main>\n\n  <div class=\"footer\">\n    <span>Educational demo · Messages are kept in server memory only.</span>\n    <span>RTT is measured with application-level WebSocket ping/pong, not ICMP ping.</span>\n  </div>\n</div>\n\n<script>\nconst usernameInput = document.getElementById(\"username\");\nconst connectBtn = document.getElementById(\"connectBtn\");\nconst messageForm = document.getElementById(\"messageForm\");\nconst messageInput = document.getElementById(\"messageInput\");\nconst sendBtn = document.getElementById(\"sendBtn\");\nconst chatWindow = document.getElementById(\"chatWindow\");\nconst emptyState = document.getElementById(\"emptyState\");\nconst statusPill = document.getElementById(\"statusPill\");\nconst statusText = document.getElementById(\"statusText\");\nconst onlineCount = document.getElementById(\"onlineCount\");\nconst rttValue = document.getElementById(\"rttValue\");\nconst messageCount = document.getElementById(\"messageCount\");\nconst connectionMetric = document.getElementById(\"connectionMetric\");\nconst activityList = document.getElementById(\"activityList\");\n\nlet socket = null;\nlet heartbeatTimer = null;\nlet receivedMessages = 0;\nlet pendingPingId = null;\nlet pingStartedAt = 0;\nlet lastOnlineCount = null;\n\nfunction setStatus(label, state) {\n  statusText.textContent = label;\n  connectionMetric.textContent = label;\n  statusPill.className = \"pill\" + (state ? \" \" + state : \"\");\n}\n\nfunction logActivity(title, detail) {\n  const item = document.createElement(\"li\");\n  item.className = \"activity-item\";\n  const mark = document.createElement(\"span\");\n  mark.className = \"activity-mark\";\n  const copy = document.createElement(\"div\");\n  copy.className = \"activity-copy\";\n  const titleEl = document.createElement(\"div\");\n  titleEl.className = \"activity-title\";\n  titleEl.textContent = title;\n  const detailEl = document.createElement(\"div\");\n  detailEl.className = \"activity-detail\";\n  detailEl.textContent = detail;\n  copy.append(titleEl, detailEl);\n  item.append(mark, copy);\n  activityList.prepend(item);\n  while (activityList.children.length > 7) activityList.lastElementChild.remove();\n}\n\nfunction prepareChat() {\n  if (emptyState) emptyState.remove();\n}\n\nfunction addSystemMessage(text, time = \"\") {\n  prepareChat();\n  const node = document.createElement(\"div\");\n  node.className = \"system\";\n  node.textContent = time ? `${time} · ${text}` : text;\n  chatWindow.appendChild(node);\n  chatWindow.scrollTop = chatWindow.scrollHeight;\n}\n\nfunction addChatMessage(data) {\n  prepareChat();\n  const wrapper = document.createElement(\"div\");\n  wrapper.className = \"message\";\n  const meta = document.createElement(\"div\");\n  meta.className = \"message-meta\";\n  const name = document.createElement(\"span\");\n  name.className = \"message-name\";\n  name.textContent = data.username || \"Unknown\";\n  const time = document.createElement(\"span\");\n  time.className = \"message-time\";\n  time.textContent = data.time || \"\";\n  const body = document.createElement(\"div\");\n  body.className = \"message-text\";\n  // textContent prevents user-supplied messages from being interpreted as HTML.\n  body.textContent = data.text || \"\";\n  meta.append(name, time);\n  wrapper.append(meta, body);\n  chatWindow.appendChild(wrapper);\n  chatWindow.scrollTop = chatWindow.scrollHeight;\n  receivedMessages += 1;\n  messageCount.textContent = String(receivedMessages);\n}\n\nfunction stopHeartbeat() {\n  if (heartbeatTimer) clearInterval(heartbeatTimer);\n  heartbeatTimer = null;\n  pendingPingId = null;\n}\n\nfunction sendHeartbeat() {\n  if (!socket || socket.readyState !== WebSocket.OPEN) return;\n\n  // If a previous heartbeat never came back, mark it as timed out and continue.\n  if (pendingPingId !== null) {\n    if (performance.now() - pingStartedAt < 5000) return;\n    logActivity(\"Heartbeat timeout\", \"No pong received within 5 seconds.\");\n    pendingPingId = null;\n  }\n\n  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;\n  pendingPingId = id;\n  pingStartedAt = performance.now();\n  socket.send(JSON.stringify({ type: \"ping\", id }));\n}\n\nfunction connect() {\n  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {\n    if (socket.readyState === WebSocket.OPEN) {\n      socket.close(1000, \"User disconnected\");\n    }\n    return;\n  }\n\n  const username = usernameInput.value.trim() || \"Guest\";\n  const scheme = location.protocol === \"https:\" ? \"wss:\" : \"ws:\";\n  const endpoint = `${scheme}//${location.host}/ws?username=${encodeURIComponent(username)}`;\n\n  setStatus(\"Connecting…\", \"connecting\");\n  connectBtn.disabled = true;\n  connectBtn.textContent = \"Connecting…\";\n  usernameInput.disabled = true;\n  logActivity(\"Connection requested\", `Opening WebSocket endpoint ${location.host}/ws`);\n\n  const currentSocket = new WebSocket(endpoint);\n  socket = currentSocket;\n\n  currentSocket.addEventListener(\"open\", () => {\n    if (socket !== currentSocket) return;\n    setStatus(\"Connected\", \"online\");\n    connectBtn.disabled = false;\n    connectBtn.textContent = \"Disconnect\";\n    messageInput.disabled = false;\n    sendBtn.disabled = false;\n    messageInput.focus();\n    logActivity(\"WebSocket connected\", `Connected to ${location.host} as ${username}`);\n    addSystemMessage(`Connected to the server as ${username}.`);\n    sendHeartbeat();\n    heartbeatTimer = setInterval(sendHeartbeat, 2000);\n  });\n\n  currentSocket.addEventListener(\"message\", (event) => {\n    if (socket !== currentSocket) return;\n    let data;\n    try { data = JSON.parse(event.data); } catch { return; }\n\n    if (data.type === \"online\") {\n      onlineCount.textContent = String(data.count);\n      if (lastOnlineCount !== data.count) {\n        logActivity(\"Online count updated\", `${data.count} client connection(s) currently registered.`);\n        lastOnlineCount = data.count;\n      }\n    } else if (data.type === \"system\") {\n      addSystemMessage(data.text, data.time || \"\");\n      logActivity(\"Server event\", data.text || \"System event\");\n    } else if (data.type === \"chat\") {\n      addChatMessage(data);\n      logActivity(\"Message broadcast received\", `${data.username}: ${data.text}`);\n    } else if (data.type === \"pong\" && data.id === pendingPingId) {\n      const rtt = performance.now() - pingStartedAt;\n      rttValue.textContent = rtt.toFixed(1);\n      pendingPingId = null;\n    }\n  });\n\n  currentSocket.addEventListener(\"error\", () => {\n    if (socket !== currentSocket) return;\n    setStatus(\"Connection error\", \"\");\n    logActivity(\"WebSocket error\", \"Check that the local server is running.\");\n  });\n\n  currentSocket.addEventListener(\"close\", () => {\n    if (socket !== currentSocket) return;\n    stopHeartbeat();\n    pendingPingId = null;\n    setStatus(\"Disconnected\", \"\");\n    connectBtn.disabled = false;\n    connectBtn.textContent = \"Connect to server\";\n    usernameInput.disabled = false;\n    messageInput.disabled = true;\n    sendBtn.disabled = true;\n    logActivity(\"WebSocket closed\", \"The client connection has ended.\");\n    addSystemMessage(\"Connection closed. You can reconnect.\");\n  });\n}\n\nfunction sendMessage() {\n  if (!socket || socket.readyState !== WebSocket.OPEN) return;\n  const text = messageInput.value.trim();\n  if (!text) return;\n  socket.send(JSON.stringify({ type: \"chat\", text }));\n  logActivity(\"Message sent\", `Submitted ${text.length} character(s) to the server.`);\n  messageInput.value = \"\";\n  messageInput.focus();\n}\n\nconnectBtn.addEventListener(\"click\", connect);\nmessageForm.addEventListener(\"submit\", (event) => {\n  event.preventDefault();\n  sendMessage();\n});\nwindow.addEventListener(\"beforeunload\", () => {\n  stopHeartbeat();\n  if (socket) socket.close();\n});\n</script>\n</body>\n</html>\n";

Deno.serve((request) => {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    return new Response(HTML, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  if (url.pathname === "/health") {
    return Response.json({ status: "ok", online: currentCount() });
  }

  if (url.pathname === "/ws") {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const username = (url.searchParams.get("username") || "Guest").trim().slice(0, 20) || "Guest";
    const { socket, response } = Deno.upgradeWebSocket(request);

    socket.addEventListener("open", () => connected(socket, username));
    socket.addEventListener("message", (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (!data || typeof data !== "object") return;

      if (data.type === "ping") {
        sendJson(socket, { type: "pong", id: data.id });
      } else if (data.type === "chat") {
        if (typeof data.text !== "string") return;
        const message = data.text.trim().slice(0, 500);
        if (!message) return;
        broadcastToAll({
          type: "chat", username, text: message, time: nowTime(),
        });
      }
    });
    socket.addEventListener("close", () => disconnected(socket));
    socket.addEventListener("error", () => disconnected(socket));
    return response;
  }

  return new Response("Not Found", { status: 404 });
});
