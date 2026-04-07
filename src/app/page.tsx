"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

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
    { id: "1", name: "Andy", role: "General Assistant", color: "bg-blue-500", messages: [] },
  ]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedAgent?.messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
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

      const finalMessages = [...updatedMessages, agentMsg];
      setAgents((prev) =>
        prev.map((a) => (a.id === selectedAgent.id ? { ...a, messages: finalMessages } : a))
      );
      setSelectedAgent((prev) => (prev ? { ...prev, messages: finalMessages } : null));
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      name: newAgentName,
      role: newAgentRole,
      color: AGENT_COLORS[agents.length % AGENT_COLORS.length],
      messages: [],
    };
    setAgents((prev) => [...prev, newAgent]);
    setNewAgentName("");
    setNewAgentRole("");
    setShowAgentModal(false);
  };

  const removeAgent = (id: string) => {
    if (agents.length <= 1) return;
    setAgents((prev) => prev.filter((a) => a.id !== id));
    if (selectedAgent?.id === id) setSelectedAgent(null);
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
              className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-sm cursor-pointer"
            >
              +
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
                {agents.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAgent(agent.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
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
          <span className="ml-auto text-xs text-gray-400">
            {agents.length} agent{agents.length > 1 ? "s" : ""}
          </span>
        </div>

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
    </div>
  );
}
