"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

// ─── Office Constants ────────────────────────────────────────────
const TILE = 32;
const MAP_COLS = 28;
const MAP_ROWS = 20;
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;
const MOVE_SPEED = 2.5;
const DESK_W = 56;
const DESK_H = 32;

const DESK_POSITIONS = [
  { x: 3, y: 4 }, { x: 9, y: 4 }, { x: 15, y: 4 }, { x: 21, y: 4 },
  { x: 3, y: 12 }, { x: 9, y: 12 }, { x: 15, y: 12 }, { x: 21, y: 12 },
];

const AGENT_HEX_COLORS: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-green-500": "#22c55e",
  "bg-purple-500": "#a855f7",
  "bg-orange-500": "#f97316",
  "bg-pink-500": "#ec4899",
  "bg-teal-500": "#14b8a6",
};

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SKIN_TONES = ["#fcd5b0", "#f5c49a", "#e8b78a", "#d4a574", "#c49060", "#a87050"];
const HAIR_COLORS = ["#2c1810", "#4a3020", "#8b6040", "#c4944a", "#e8c870", "#d44020"];

// ─── Office Drawing Helpers ─────────────────────────────────────
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, bodyColor: string, skinIdx: number, hairIdx: number, label: string, labelColor: string) {
  const skin = SKIN_TONES[skinIdx % SKIN_TONES.length];
  const hair = HAIR_COLORS[hairIdx % HAIR_COLORS.length];

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath(); ctx.ellipse(x, y + 16, 12, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Body
  ctx.fillStyle = bodyColor;
  drawRoundRect(ctx, x - 10, y - 2, 20, 18, 4); ctx.fill();

  // Arms
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x - 14, y + 1, 5, 12);
  ctx.fillRect(x + 9, y + 1, 5, 12);
  ctx.fillStyle = skin;
  ctx.fillRect(x - 14, y + 10, 5, 4);
  ctx.fillRect(x + 9, y + 10, 5, 4);

  // Head
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(x, y - 10, 11, 0, Math.PI * 2); ctx.fill();

  // Hair
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(x, y - 14, 11, Math.PI, 2 * Math.PI); ctx.fill();
  ctx.fillRect(x - 11, y - 16, 22, 5);

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x - 4, y - 11, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 4, y - 11, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e293b";
  ctx.beginPath(); ctx.arc(x - 3, y - 11, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5, y - 11, 2, 0, Math.PI * 2); ctx.fill();
  // Eye highlights
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x - 2.5, y - 12, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5.5, y - 12, 0.8, 0, Math.PI * 2); ctx.fill();

  // Mouth
  ctx.fillStyle = "#e87461";
  ctx.beginPath(); ctx.arc(x, y - 6, 2, 0, Math.PI); ctx.fill();

  // Label
  ctx.font = "bold 10px 'Segoe UI', sans-serif";
  const tw = ctx.measureText(label).width;
  drawRoundRect(ctx, x - tw / 2 - 5, y - 30, tw + 10, 14, 7);
  ctx.fillStyle = labelColor;
  ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.fillText(label, x, y - 20);
  ctx.textAlign = "start";
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Desk legs
  ctx.fillStyle = "#8b6040";
  ctx.fillRect(x + 3, y + DESK_H - 2, 4, 6);
  ctx.fillRect(x + DESK_W - 7, y + DESK_H - 2, 4, 6);

  // Desk surface shadow
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  drawRoundRect(ctx, x + 2, y + 2, DESK_W, DESK_H, 3); ctx.fill();

  // Desk surface
  const grad = ctx.createLinearGradient(x, y, x, y + DESK_H);
  grad.addColorStop(0, "#c8956a");
  grad.addColorStop(1, "#b8855a");
  ctx.fillStyle = grad;
  drawRoundRect(ctx, x, y, DESK_W, DESK_H, 3); ctx.fill();
  ctx.strokeStyle = "#a07050"; ctx.lineWidth = 1;
  drawRoundRect(ctx, x, y, DESK_W, DESK_H, 3); ctx.stroke();

  // Desk edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + 2, y + 1, DESK_W - 4, 2);

  // Monitor
  ctx.fillStyle = "#1e293b";
  drawRoundRect(ctx, x + DESK_W / 2 - 12, y + 3, 24, 16, 2); ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x + DESK_W / 2 - 10, y + 5, 20, 12);
  // Screen glow
  const screenGrad = ctx.createLinearGradient(x + DESK_W / 2 - 9, y + 5, x + DESK_W / 2 + 9, y + 16);
  screenGrad.addColorStop(0, "#818cf8");
  screenGrad.addColorStop(0.5, "#60a5fa");
  screenGrad.addColorStop(1, "#34d399");
  ctx.fillStyle = screenGrad;
  ctx.fillRect(x + DESK_W / 2 - 9, y + 6, 18, 10);
  // Monitor stand
  ctx.fillStyle = "#374151";
  ctx.fillRect(x + DESK_W / 2 - 3, y + 19, 6, 4);
  ctx.fillRect(x + DESK_W / 2 - 6, y + 22, 12, 2);

  // Keyboard
  ctx.fillStyle = "#d1d5db";
  drawRoundRect(ctx, x + DESK_W / 2 - 10, y + DESK_H - 8, 20, 6, 1); ctx.fill();
  ctx.fillStyle = "#9ca3af";
  for (let ki = 0; ki < 4; ki++) {
    for (let kj = 0; kj < 7; kj++) {
      ctx.fillRect(x + DESK_W / 2 - 9 + kj * 2.7, y + DESK_H - 7 + ki * 1.4, 1.8, 0.8);
    }
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Pot
  ctx.fillStyle = "#b45309";
  drawRoundRect(ctx, x - size * 0.4, y + size * 0.3, size * 0.8, size * 0.6, 3); ctx.fill();
  ctx.fillStyle = "#92400e";
  ctx.fillRect(x - size * 0.45, y + size * 0.25, size * 0.9, size * 0.15);

  // Leaves
  ctx.fillStyle = "#22c55e";
  ctx.beginPath(); ctx.arc(x, y - size * 0.1, size * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#16a34a";
  ctx.beginPath(); ctx.arc(x - size * 0.15, y, size * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4ade80";
  ctx.beginPath(); ctx.arc(x + size * 0.12, y - size * 0.25, size * 0.25, 0, Math.PI * 2); ctx.fill();
}

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
  persona: string;
  color: string;
  messages: Message[];
};

const AGENT_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
];

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([
    { id: "1", name: "Andy", role: "General Assistant", persona: "", color: "bg-blue-500", messages: [] },
  ]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("");
  const [newAgentPersona, setNewAgentPersona] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [viewMode, setViewMode] = useState<"chat" | "office">("chat");
  const [showFireConfirm, setShowFireConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Office refs ──────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const playerRef = useRef({ x: MAP_W / 2, y: MAP_H - 60 });
  const animFrameRef = useRef<number>(0);
  const agentsRef = useRef(agents);
  const runningRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedAgent?.messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent || isLoading) return;

    const userMsg: Message = {
      id: genId(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const updatedMessages = [...selectedAgent.messages, userMsg];
    setAgents((prev) =>
      prev.map((a) => (a.id === selectedAgent.id ? { ...a, messages: updatedMessages } : a))
    );
    setSelectedAgent((prev) => (prev ? { ...prev, messages: updatedMessages } : null));

    const sentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sentInput,
          agentName: selectedAgent.name,
          agentRole: selectedAgent.role,
          agentPersona: selectedAgent.persona,
          ...(apiKey && { apiKey }),
          history: selectedAgent.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();

      const agentMsg: Message = {
        id: genId(),
        role: "assistant",
        content: data.content || data.error || "응답을 받지 못했습니다.",
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, agentMsg];
      setAgents((prev) =>
        prev.map((a) => (a.id === selectedAgent.id ? { ...a, messages: finalMessages } : a))
      );
      setSelectedAgent((prev) => (prev ? { ...prev, messages: finalMessages } : null));
    } catch {
      const errMsg: Message = {
        id: genId(),
        role: "assistant",
        content: "연결 실패. 다시 시도해주세요.",
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessages, errMsg];
      setAgents((prev) =>
        prev.map((a) => (a.id === selectedAgent.id ? { ...a, messages: finalMessages } : a))
      );
      setSelectedAgent((prev) => (prev ? { ...prev, messages: finalMessages } : null));
    } finally {
      setIsLoading(false);
    }
  };

  const addAgent = () => {
    if (!newAgentName.trim() || !newAgentRole.trim()) return;
    const newAgent: Agent = {
      id: genId(),
      name: newAgentName,
      role: newAgentRole,
      persona: newAgentPersona,
      color: AGENT_COLORS[agents.length % AGENT_COLORS.length],
      messages: [],
    };
    setAgents((prev) => [...prev, newAgent]);
    setNewAgentName("");
    setNewAgentRole("");
    setNewAgentPersona("");
    setShowAgentModal(false);
  };

  const fireAgent = () => {
    if (!selectedAgent || agents.length <= 1) return;
    setAgents((prev) => prev.filter((a) => a.id !== selectedAgent.id));
    setSelectedAgent(null);
    setShowFireConfirm(false);
  };

  // ─── Office: keep agentsRef in sync ────────────────────────────
  useEffect(() => { agentsRef.current = agents; }, [agents]);

  // ─── Office: keyboard ─────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(e.key)) {
        if (document.activeElement?.tagName !== "INPUT") {
          e.preventDefault();
          keysRef.current.add(e.key);
        }
      }
    };
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ─── Office: draw frame ───────────────────────────────────────
  const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
    const cur = agentsRef.current;
    const keys = keysRef.current;
    const p = playerRef.current;

    // Movement
    let nx = p.x, ny = p.y;
    if (keys.has("ArrowUp") || keys.has("w")) ny -= MOVE_SPEED;
    if (keys.has("ArrowDown") || keys.has("s")) ny += MOVE_SPEED;
    if (keys.has("ArrowLeft") || keys.has("a")) nx -= MOVE_SPEED;
    if (keys.has("ArrowRight") || keys.has("d")) nx += MOVE_SPEED;
    nx = Math.max(20, Math.min(MAP_W - 20, nx));
    ny = Math.max(20, Math.min(MAP_H - 20, ny));

    let blocked = false;
    for (let i = 0; i < cur.length; i++) {
      const dp = DESK_POSITIONS[i]; if (!dp) break;
      const dx = dp.x * TILE, dy = dp.y * TILE;
      if (nx > dx - 8 && nx < dx + DESK_W + 8 && ny > dy - 8 && ny < dy + DESK_H + 45) { blocked = true; break; }
    }
    if (!blocked) { p.x = nx; p.y = ny; }

    ctx.clearRect(0, 0, MAP_W, MAP_H);

    // ── Floor ──
    // Base floor
    ctx.fillStyle = "#e8dfd0";
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Wood floor pattern
    for (let fy = 0; fy < MAP_ROWS; fy++) {
      for (let fx = 0; fx < MAP_COLS; fx++) {
        const tx = fx * TILE, ty = fy * TILE;
        ctx.fillStyle = (fx + fy) % 2 === 0 ? "#e2d8c8" : "#ddd0be";
        ctx.fillRect(tx, ty, TILE, TILE);
        ctx.strokeStyle = "rgba(0,0,0,0.04)"; ctx.lineWidth = 0.5;
        ctx.strokeRect(tx, ty, TILE, TILE);
      }
    }

    // Carpet areas (under desk rows)
    ctx.fillStyle = "rgba(99,102,241,0.08)";
    drawRoundRect(ctx, 2 * TILE - 10, 3 * TILE - 10, 24 * TILE + 20, 5 * TILE + 20, 8); ctx.fill();
    ctx.fillStyle = "rgba(99,102,241,0.08)";
    drawRoundRect(ctx, 2 * TILE - 10, 11 * TILE - 10, 24 * TILE + 20, 5 * TILE + 20, 8); ctx.fill();

    // ── Walls ──
    // Wall base
    ctx.fillStyle = "#4a5568";
    ctx.fillRect(0, 0, MAP_W, 10); ctx.fillRect(0, 0, 10, MAP_H);
    ctx.fillRect(MAP_W - 10, 0, 10, MAP_H); ctx.fillRect(0, MAP_H - 10, MAP_W, 10);

    // Wall top highlight
    ctx.fillStyle = "#718096";
    ctx.fillRect(0, 0, MAP_W, 3); ctx.fillRect(0, 0, 3, MAP_H);

    // Wall bottom decoration (baseboard)
    ctx.fillStyle = "#2d3748";
    ctx.fillRect(10, MAP_H - 12, MAP_W - 20, 2);
    ctx.fillRect(10, 10, MAP_W - 20, 2);
    ctx.fillRect(10, 10, 2, MAP_H - 20);
    ctx.fillRect(MAP_W - 12, 10, 2, MAP_H - 20);

    // Door
    ctx.fillStyle = "#92400e";
    drawRoundRect(ctx, MAP_W / 2 - 24, MAP_H - 10, 48, 10, 0); ctx.fill();
    ctx.fillStyle = "#b45309";
    ctx.fillRect(MAP_W / 2 - 22, MAP_H - 8, 44, 6);
    // Door knob
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath(); ctx.arc(MAP_W / 2 + 12, MAP_H - 5, 2.5, 0, Math.PI * 2); ctx.fill();

    // ── Wall decorations ──
    // Whiteboard
    ctx.fillStyle = "#e5e7eb";
    drawRoundRect(ctx, MAP_W / 2 - 60, 14, 120, 50, 4); ctx.fill();
    ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 2;
    drawRoundRect(ctx, MAP_W / 2 - 60, 14, 120, 50, 4); ctx.stroke();
    ctx.fillStyle = "#6366f1"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("MAPC Office", MAP_W / 2, 44);
    ctx.fillStyle = "#9ca3af"; ctx.font = "10px sans-serif";
    ctx.fillText("Multi-Agent Personal Canvas", MAP_W / 2, 58);
    ctx.textAlign = "start";

    // Clock on wall
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(MAP_W - 40, 40, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#374151"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(MAP_W - 40, 40, 16, 0, Math.PI * 2); ctx.stroke();
    const now = new Date();
    const hAngle = (now.getHours() % 12 + now.getMinutes() / 60) * Math.PI / 6 - Math.PI / 2;
    const mAngle = now.getMinutes() * Math.PI / 30 - Math.PI / 2;
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(MAP_W - 40, 40);
    ctx.lineTo(MAP_W - 40 + Math.cos(hAngle) * 8, 40 + Math.sin(hAngle) * 8); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(MAP_W - 40, 40);
    ctx.lineTo(MAP_W - 40 + Math.cos(mAngle) * 11, 40 + Math.sin(mAngle) * 11); ctx.stroke();

    // Picture frames on left wall
    for (let fi = 0; fi < 2; fi++) {
      const fy = 80 + fi * 100;
      ctx.fillStyle = "#92400e";
      drawRoundRect(ctx, 14, fy, 36, 28, 2); ctx.fill();
      ctx.fillStyle = ["#dbeafe", "#fce7f3"][fi];
      ctx.fillRect(17, fy + 3, 30, 22);
      ctx.fillStyle = ["#60a5fa", "#f472b6"][fi];
      ctx.beginPath(); ctx.arc(32, fy + 10, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ["#34d399", "#a78bfa"][fi];
      ctx.fillRect(20, fy + 15, 24, 8);
    }

    // ── Plants ──
    drawPlant(ctx, 35, MAP_H - 40, 16);
    drawPlant(ctx, MAP_W - 35, MAP_H - 40, 16);
    drawPlant(ctx, MAP_W - 35, 80, 14);

    // Coffee machine on right wall
    ctx.fillStyle = "#374151";
    drawRoundRect(ctx, MAP_W - 50, MAP_H / 2 - 15, 30, 30, 4); ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(MAP_W - 46, MAP_H / 2 - 10, 22, 16);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(MAP_W - 35, MAP_H / 2 + 10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9ca3af"; ctx.font = "7px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("COFFEE", MAP_W - 35, MAP_H / 2 - 2); ctx.textAlign = "start";

    // ── Desks & Agents ──
    for (let i = 0; i < cur.length; i++) {
      const dp = DESK_POSITIONS[i]; if (!dp) break;
      const agent = cur[i];
      const dx = dp.x * TILE, dy = dp.y * TILE;
      const cx = dx + DESK_W / 2;
      const hex = AGENT_HEX_COLORS[agent.color] || "#6b7280";

      // Chair
      ctx.fillStyle = "#374151";
      drawRoundRect(ctx, cx - 10, dy + DESK_H + 6, 20, 16, 4); ctx.fill();
      ctx.fillStyle = "#4b5563";
      drawRoundRect(ctx, cx - 12, dy + DESK_H + 2, 24, 8, 3); ctx.fill();

      drawDesk(ctx, dx, dy);

      // Agent character
      const charY = dy + DESK_H + 22;
      drawCharacter(ctx, cx, charY, hex, i * 2, i * 3 + 1, agent.name, hex);

      // Role tag below
      ctx.font = "9px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillText(agent.role, cx, charY + 28);
      ctx.textAlign = "start";
    }

    // ── Player ──
    drawCharacter(ctx, p.x, p.y, "#ef4444", 0, 4, "나", "rgba(239,68,68,0.9)");

    // ── Instructions ──
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.font = "11px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
    ctx.fillText("방향키/WASD로 이동  |  에이전트를 클릭하여 대화", MAP_W / 2, MAP_H - 18);
    ctx.textAlign = "start";
  }, []);

  // ─── Office: canvas callback ref ──────────────────────────────
  const canvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
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

  // ─── Office: click agent ──────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (let i = 0; i < agents.length; i++) {
      const dp = DESK_POSITIONS[i];
      if (!dp) break;
      const cx = dp.x * TILE + DESK_W / 2;
      const cy = dp.y * TILE + DESK_H + 22;
      if (Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2) < 35) {
        setSelectedAgent(agents[i]);
        setViewMode("chat");
        return;
      }
    }
  };

  const currentMessages = selectedAgent?.messages || [];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-300 bg-gray-900 text-white flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-700">
          <Image src="/logo.svg" alt="MAPC" width={120} height={36} priority />
          <p className="text-xs text-gray-400 mt-2">Multi-Agent Personal Canvas</p>
        </div>

        {/* Agents List */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Agents
            </h2>
            <button
              onClick={() => setShowAgentModal(true)}
              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-xs cursor-pointer"
            >
              Hire
            </button>
          </div>

          <div className="space-y-1">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer group ${
                  selectedAgent?.id === agent.id
                    ? "bg-gray-700"
                    : "hover:bg-gray-800"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full ${agent.color} flex items-center justify-center text-xs font-bold shrink-0`}
                >
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-gray-400 truncate">{agent.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${
                apiKey ? "bg-green-400" : "bg-yellow-400"
              }`}
            />
            <span className="text-xs text-gray-400">
              {apiKey ? "API Key 연결됨" : "CLI 모드 (개발용)"}
            </span>
          </div>
          <button
            onClick={() => {
              setTempApiKey(apiKey);
              setShowSettings(true);
            }}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 flex items-center gap-2 cursor-pointer"
          >
            <span>⚙</span>
            <span>설정</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
          >
            ☰
          </button>
          {selectedAgent ? (
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full ${selectedAgent.color} flex items-center justify-center text-xs font-bold text-white`}
              >
                {selectedAgent.name[0]}
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                  {selectedAgent.name}
                </h2>
                <p className="text-xs text-gray-400">{selectedAgent.role}</p>
              </div>
            </div>
          ) : (
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Chat</h2>
          )}
          <div className="ml-auto flex items-center gap-2">
            {selectedAgent && viewMode === "chat" && agents.length > 1 && (
              <button
                onClick={() => setShowFireConfirm(true)}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs rounded-lg cursor-pointer transition-colors"
              >
                Fire
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === "chat" ? "office" : "chat")}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg cursor-pointer transition-colors"
            >
              {viewMode === "chat" ? "Office" : "Chat"}
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === "chat" ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!selectedAgent && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-lg mb-2">MAPC에 오신 것을 환영합니다</p>
                    <p className="text-sm">
                      좌측에서 에이전트를 선택하여 대화를 시작하세요
                    </p>
                  </div>
                </div>
              )}

              {selectedAgent && currentMessages.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-lg mb-2">{selectedAgent.name}</p>
                    <p className="text-sm">메시지를 보내서 대화를 시작하세요</p>
                  </div>
                </div>
              )}

              {currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-sm"
                    } px-4 py-3`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.role === "user" ? "text-blue-200" : "text-gray-400"
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
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {selectedAgent && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    disabled={isLoading}
                    placeholder={isLoading ? "응답 중..." : `${selectedAgent.name}에게 메시지...`}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoading ? "..." : "전송"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Office View */
          <div className="flex-1 flex items-center justify-center bg-gray-950 p-4 overflow-auto">
            <canvas
              ref={canvasCallbackRef}
              width={MAP_W}
              height={MAP_H}
              onClick={handleCanvasClick}
              className="rounded-xl shadow-2xl cursor-pointer"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          </div>
        )}
      </div>

      {/* Add Agent Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              새 에이전트 추가
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">이름</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="예: Sarah"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">역할</label>
                <input
                  type="text"
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value)}
                  placeholder="예: Data Analyst"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">페르소나 (선택)</label>
                <textarea
                  value={newAgentPersona}
                  onChange={(e) => setNewAgentPersona(e.target.value)}
                  placeholder="예: 친근하고 유머러스한 톤으로 대화하며, 복잡한 내용을 쉽게 설명해주는 성격"
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAgentModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={addAgent}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium cursor-pointer"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">설정</h3>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Anthropic API Key</label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-2">
                비워두면 서버의 Claude Code CLI를 사용합니다 (개발 모드).
              </p>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
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

      {/* Fire Confirm Modal */}
      {showFireConfirm && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-red-500 mb-3">
              에이전트 해고
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <span className="font-semibold">{selectedAgent.name}</span>을(를) 해고하시겠습니까?
            </p>
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-3 mb-4">
              해고 시 해당 에이전트와 나눈 모든 대화 기록이 영구적으로 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFireConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={fireAgent}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium cursor-pointer"
              >
                해고
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
