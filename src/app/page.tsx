"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type Agent = {
  id: string;
  name: string;
  role: string;
  color: string;
  deskX: number;
  deskY: number;
  messages: Message[];
};

type Player = {
  x: number;
  y: number;
};

// ─── Constants ───────────────────────────────────────────────────

const TILE = 40;
const MAP_COLS = 24;
const MAP_ROWS = 16;
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;
const PLAYER_SIZE = 28;
const AGENT_SIZE = 28;
const DESK_W = 60;
const DESK_H = 40;
const MOVE_SPEED = 3;

const AGENT_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#14b8a6"];

const DESK_POSITIONS = [
  { x: 3, y: 3 },
  { x: 8, y: 3 },
  { x: 13, y: 3 },
  { x: 18, y: 3 },
  { x: 3, y: 9 },
  { x: 8, y: 9 },
  { x: 13, y: 9 },
  { x: 18, y: 9 },
];

// ─── Component ───────────────────────────────────────────────────

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const playerRef = useRef<Player>({ x: MAP_W / 2, y: MAP_H - 80 });
  const animFrameRef = useRef<number>(0);
  const agentsRef = useRef<Agent[]>([]);
  const runningRef = useRef(false);

  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "Andy",
      role: "General Assistant",
      color: AGENT_COLORS[0],
      deskX: DESK_POSITIONS[0].x * TILE,
      deskY: DESK_POSITIONS[0].y * TILE,
      messages: [],
    },
  ]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedAgent?.messages.length]);

  // Keep agentsRef in sync
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // ─── Keyboard ─────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          keysRef.current.add(e.key);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ─── Draw function ────────────────────────────────────────────

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
    const currentAgents = agentsRef.current;
    const keys = keysRef.current;
    const p = playerRef.current;

    // Movement
    let nx = p.x;
    let ny = p.y;
    if (keys.has("ArrowUp") || keys.has("w")) ny -= MOVE_SPEED;
    if (keys.has("ArrowDown") || keys.has("s")) ny += MOVE_SPEED;
    if (keys.has("ArrowLeft") || keys.has("a")) nx -= MOVE_SPEED;
    if (keys.has("ArrowRight") || keys.has("d")) nx += MOVE_SPEED;

    const margin = 20;
    nx = Math.max(margin, Math.min(MAP_W - margin, nx));
    ny = Math.max(margin, Math.min(MAP_H - margin, ny));

    let blocked = false;
    for (const agent of currentAgents) {
      if (nx > agent.deskX - 10 && nx < agent.deskX + DESK_W + 10 &&
          ny > agent.deskY - 10 && ny < agent.deskY + DESK_H + 50) {
        blocked = true;
        break;
      }
    }
    if (!blocked) { p.x = nx; p.y = ny; }

    ctx.clearRect(0, 0, MAP_W, MAP_H);

    // Floor
    ctx.fillStyle = "#f3f0e8";
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Grid
    ctx.strokeStyle = "#e5e0d5";
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= MAP_W; gx += TILE) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, MAP_H); ctx.stroke();
    }
    for (let gy = 0; gy <= MAP_H; gy += TILE) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(MAP_W, gy); ctx.stroke();
    }

    // Walls
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(0, 0, MAP_W, 8);
    ctx.fillRect(0, 0, 8, MAP_H);
    ctx.fillRect(MAP_W - 8, 0, 8, MAP_H);
    ctx.fillRect(0, MAP_H - 8, MAP_W, 8);

    // Door
    ctx.fillStyle = "#92400e";
    ctx.fillRect(MAP_W / 2 - 30, MAP_H - 8, 60, 8);

    // Sign
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ACAW Office", MAP_W / 2, 32);
    ctx.textAlign = "start";

    // Plants
    const plants = [[30, 30], [MAP_W - 50, 30], [30, MAP_H - 40], [MAP_W - 50, MAP_H - 40]];
    for (const [px, py] of plants) {
      ctx.fillStyle = "#65a30d";
      ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#92400e";
      ctx.fillRect(px - 3, py + 8, 6, 10);
    }

    // Desks & Agents
    for (const agent of currentAgents) {
      const cx = agent.deskX + DESK_W / 2;
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(agent.deskX + 3, agent.deskY + 3, DESK_W, DESK_H);
      ctx.fillStyle = "#d4a574";
      ctx.fillRect(agent.deskX, agent.deskY, DESK_W, DESK_H);
      ctx.strokeStyle = "#b8956a"; ctx.lineWidth = 1.5;
      ctx.strokeRect(agent.deskX, agent.deskY, DESK_W, DESK_H);
      ctx.fillStyle = "#374151";
      ctx.fillRect(cx - 10, agent.deskY + 5, 20, 14);
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(cx - 8, agent.deskY + 7, 16, 10);

      const chairY = agent.deskY + DESK_H + 8;
      ctx.fillStyle = agent.color;
      ctx.beginPath(); ctx.arc(cx, chairY + 4, AGENT_SIZE / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(cx, chairY - 10, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.beginPath(); ctx.arc(cx - 3, chairY - 12, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3, chairY - 12, 2, 0, Math.PI * 2); ctx.fill();

      ctx.font = "bold 11px sans-serif";
      const nw = ctx.measureText(agent.name).width;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(cx - nw / 2 - 6, chairY + AGENT_SIZE / 2 + 4, nw + 12, 18);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(agent.name, cx, chairY + AGENT_SIZE / 2 + 16);
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.font = "9px sans-serif";
      ctx.fillText(agent.role, cx, chairY + AGENT_SIZE / 2 + 30);
      ctx.textAlign = "start";
    }

    // Player
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + PLAYER_SIZE / 2 + 2, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(p.x, p.y + 2, PLAYER_SIZE / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath(); ctx.arc(p.x, p.y - 12, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath(); ctx.arc(p.x - 3, p.y - 14, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 3, p.y - 14, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y - 10, 4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();

    ctx.font = "bold 10px sans-serif";
    const youW = ctx.measureText("나").width;
    ctx.fillStyle = "rgba(239,68,68,0.85)";
    ctx.fillRect(p.x - youW / 2 - 6, p.y - 30, youW + 12, 16);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.fillText("나", p.x, p.y - 18); ctx.textAlign = "start";

    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("방향키/WASD로 이동 | 에이전트를 클릭하여 대화", MAP_W / 2, MAP_H - 16);
    ctx.textAlign = "start";
  }, []);

  // ─── Canvas callback ref → starts game loop ──────────────────

  const canvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    // Cleanup previous loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    runningRef.current = false;
    canvasRef.current = node;

    if (!node) return;

    const ctx = node.getContext("2d");
    if (!ctx) return;

    runningRef.current = true;

    function loop() {
      if (!runningRef.current) return;
      drawFrame(ctx!);
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);
  }, [drawFrame]);

  // ─── Canvas Click → Agent Selection ──────────────────────────

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (const agent of agents) {
      const cx = agent.deskX + DESK_W / 2;
      const cy = agent.deskY + DESK_H + 8 + 4;
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
      if (dist < 30) {
        setSelectedAgent(agent);
        return;
      }
    }
  };

  // ─── Chat ────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedAgent || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };

    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgent.id
          ? { ...a, messages: [...a.messages, userMsg] }
          : a
      )
    );
    setSelectedAgent((prev) =>
      prev ? { ...prev, messages: [...prev.messages, userMsg] } : null
    );

    const sentInput = chatInput;
    setChatInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sentInput,
          agentName: selectedAgent.name,
          agentRole: selectedAgent.role,
          ...(apiKey && { apiKey }),
        }),
      });
      const data = await res.json();

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content || data.error || "응답을 받지 못했습니다.",
        timestamp: new Date(),
      };

      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedAgent.id
            ? { ...a, messages: [...a.messages, userMsg, agentMsg] }
            : a
        )
      );
      setSelectedAgent((prev) =>
        prev ? { ...prev, messages: [...prev.messages, agentMsg] } : null
      );
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "연결 실패. 다시 시도해주세요.",
        timestamp: new Date(),
      };
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedAgent.id
            ? { ...a, messages: [...a.messages, userMsg, errMsg] }
            : a
        )
      );
      setSelectedAgent((prev) =>
        prev ? { ...prev, messages: [...prev.messages, errMsg] } : null
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Add Agent ───────────────────────────────────────────────

  const addAgent = () => {
    if (!newAgentName.trim() || !newAgentRole.trim()) return;
    const idx = agents.length;
    if (idx >= DESK_POSITIONS.length) return;

    const newAgent: Agent = {
      id: crypto.randomUUID(),
      name: newAgentName,
      role: newAgentRole,
      color: AGENT_COLORS[idx % AGENT_COLORS.length],
      deskX: DESK_POSITIONS[idx].x * TILE,
      deskY: DESK_POSITIONS[idx].y * TILE,
      messages: [],
    };

    setAgents((prev) => [...prev, newAgent]);
    setNewAgentName("");
    setNewAgentRole("");
    setShowAddAgent(false);
  };

  const removeAgent = (id: string) => {
    if (agents.length <= 1) return;
    setAgents((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      return filtered.map((a, i) => ({
        ...a,
        deskX: DESK_POSITIONS[i].x * TILE,
        deskY: DESK_POSITIONS[i].y * TILE,
      }));
    });
    if (selectedAgent?.id === id) setSelectedAgent(null);
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Left Panel - Office View */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">ACAW Office</h1>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
              {agents.length} agent{agents.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  apiKey ? "bg-green-400" : "bg-yellow-400"
                }`}
              />
              <span className="text-xs text-gray-400">
                {apiKey ? "API" : "CLI"}
              </span>
            </div>
            <button
              onClick={() => setShowAddAgent(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg cursor-pointer"
            >
              + 에이전트
            </button>
            <button
              onClick={() => {
                setTempApiKey(apiKey);
                setShowSettings(true);
              }}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg cursor-pointer"
            >
              ⚙ 설정
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-gray-950 p-4 overflow-auto">
          <canvas
            ref={canvasCallbackRef}
            width={MAP_W}
            height={MAP_H}
            onClick={handleCanvasClick}
            className="rounded-xl shadow-2xl cursor-pointer border-2 border-gray-600 block"
            style={{
              width: `${MAP_W}px`,
              height: `${MAP_H}px`,
              minWidth: `${MAP_W}px`,
              minHeight: `${MAP_H}px`,
              background: "#f3f0e8",
            }}
          />
        </div>
      </div>

      {/* Right Panel - Chat */}
      {selectedAgent && (
        <div className="w-96 flex flex-col bg-gray-900 border-l border-gray-800">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: selectedAgent.color }}
              >
                {selectedAgent.name[0]}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {selectedAgent.name}
                </p>
                <p className="text-gray-400 text-xs">{selectedAgent.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => removeAgent(selectedAgent.id)}
                className="px-2 py-1 text-gray-500 hover:text-red-400 text-xs cursor-pointer"
                title="에이전트 삭제"
              >
                삭제
              </button>
              <button
                onClick={() => setSelectedAgent(null)}
                className="px-2 py-1 text-gray-500 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedAgent.messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-sm text-center">
                  {selectedAgent.name}에게 메시지를 보내보세요
                </p>
              </div>
            )}
            {selectedAgent.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                      : "bg-gray-800 text-gray-200 rounded-2xl rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.role === "user" ? "text-blue-200" : "text-gray-500"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessage()
                }
                disabled={isLoading}
                placeholder={
                  isLoading ? "응답 중..." : `${selectedAgent.name}에게 메시지...`
                }
                className="flex-1 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? "..." : "전송"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddAgent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-96 shadow-xl border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4">
              새 에이전트 추가
            </h3>
            {agents.length >= DESK_POSITIONS.length ? (
              <p className="text-gray-400 text-sm">
                최대 {DESK_POSITIONS.length}명까지 추가할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">이름</label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="예: Sarah"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">역할</label>
                  <input
                    type="text"
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value)}
                    placeholder="예: Data Analyst"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAddAgent(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:bg-gray-800 cursor-pointer"
              >
                취소
              </button>
              {agents.length < DESK_POSITIONS.length && (
                <button
                  onClick={addAgent}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium cursor-pointer"
                >
                  추가
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-96 shadow-xl border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4">설정</h3>
            <div>
              <label className="text-sm text-gray-400">
                Anthropic API Key
              </label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                비워두면 서버의 Claude Code CLI를 사용합니다 (개발 모드).
              </p>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:bg-gray-800 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setApiKey(tempApiKey);
                  setShowSettings(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium cursor-pointer"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
