"use client";

import Link from "next/link";
import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Circle, Download, Eraser, Highlighter, Minus, Pencil,
  Redo2, RotateCcw, Square, Type, Undo2,
} from "lucide-react";

type Point = { x: number; y: number };
type DrawTool = "pen" | "highlighter" | "eraser" | "line" | "rectangle" | "ellipse" | "text";
type Operation = {
  tool: DrawTool;
  color: string;
  width: number;
  points: Point[];
  text?: string;
};

const STORAGE_KEY = "steven-toolbox-whiteboard-v1";
const colors = ["#111827", "#2563eb", "#7c3aed", "#dc2626", "#ea580c", "#16a34a"];

function toolCursor(tool: DrawTool) {
  return tool === "text" ? "text" : tool === "eraser" ? "cell" : "crosshair";
}

export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const operationsRef = useRef<Operation[]>([]);
  const currentRef = useRef<Operation | null>(null);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState(colors[0]);
  const [width, setWidth] = useState(4);
  const [text, setText] = useState("Idea");
  const [historyVersion, setHistoryVersion] = useState(0);
  const [redoStack, setRedoStack] = useState<Operation[]>([]);
  const [saved, setSaved] = useState(false);

  const drawOperation = useCallback((context: CanvasRenderingContext2D, operation: Operation) => {
    const [start, end = start] = [operation.points[0], operation.points.at(-1) ?? operation.points[0]];
    if (!start) return;
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = operation.width;
    context.strokeStyle = operation.tool === "eraser" ? "#ffffff" : operation.color;
    context.fillStyle = operation.color;
    context.globalAlpha = operation.tool === "highlighter" ? 0.3 : 1;

    if (["pen", "highlighter", "eraser"].includes(operation.tool)) {
      context.beginPath();
      context.moveTo(start.x, start.y);
      operation.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    } else if (operation.tool === "line") {
      context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    } else if (operation.tool === "rectangle") {
      context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (operation.tool === "ellipse") {
      context.beginPath();
      context.ellipse((start.x + end.x) / 2, (start.y + end.y) / 2, Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 2, 0, 0, Math.PI * 2);
      context.stroke();
    } else if (operation.tool === "text" && operation.text) {
      context.font = `${Math.max(16, operation.width * 5)}px ui-sans-serif, system-ui, sans-serif`;
      context.fillText(operation.text, start.x, start.y);
    }
    context.restore();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#dbe3ee";
    for (let x = 12; x < canvas.width; x += 24) {
      for (let y = 12; y < canvas.height; y += 24) context.fillRect(x, y, 1.5, 1.5);
    }
    operationsRef.current.forEach((operation) => drawOperation(context, operation));
    if (currentRef.current) drawOperation(context, currentRef.current);
  }, [drawOperation]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) operationsRef.current = JSON.parse(stored) as Operation[];
    } catch { /* Ignore invalid local drafts. */ }
    setHistoryVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const resize = () => {
      const bounds = wrapper.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(bounds.width));
      canvas.height = Math.max(1, Math.floor(bounds.height));
      redraw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [historyVersion, redraw]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z") { event.preventDefault(); undo(); }
      if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    const operation: Operation = { tool, color, width: tool === "eraser" ? width * 4 : tool === "highlighter" ? width * 3 : width, points: [point], text: tool === "text" ? text.trim() : undefined };
    if (tool === "text") {
      if (!operation.text) return;
      operationsRef.current.push(operation); commit();
    } else currentRef.current = operation;
  }

  function continueDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!currentRef.current) return;
    const point = pointFromEvent(event);
    if (["pen", "highlighter", "eraser"].includes(currentRef.current.tool)) currentRef.current.points.push(point);
    else currentRef.current.points[1] = point;
    redraw();
  }

  function finishDrawing() {
    if (!currentRef.current) return;
    operationsRef.current.push(currentRef.current);
    currentRef.current = null;
    commit();
  }

  function commit() {
    setRedoStack([]);
    setHistoryVersion((value) => value + 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operationsRef.current));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1000);
  }

  function undo() {
    const operation = operationsRef.current.pop();
    if (!operation) return;
    setRedoStack((stack) => [...stack, operation]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operationsRef.current));
    setHistoryVersion((value) => value + 1);
  }

  function redo() {
    setRedoStack((stack) => {
      const operation = stack.at(-1);
      if (!operation) return stack;
      operationsRef.current.push(operation);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operationsRef.current));
      setHistoryVersion((value) => value + 1);
      return stack.slice(0, -1);
    });
  }

  function clearBoard() {
    if (!operationsRef.current.length || !window.confirm("Clear the entire whiteboard?")) return;
    operationsRef.current = [];
    commit();
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const anchor = document.createElement("a");
    anchor.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    anchor.href = canvas.toDataURL("image/png");
    anchor.click();
  }

  const tools: Array<{ id: DrawTool; label: string; icon: typeof Pencil }> = [
    { id: "pen", label: "Pen", icon: Pencil }, { id: "highlighter", label: "Highlighter", icon: Highlighter },
    { id: "eraser", label: "Eraser", icon: Eraser }, { id: "line", label: "Line", icon: Minus },
    { id: "rectangle", label: "Rectangle", icon: Square }, { id: "ellipse", label: "Ellipse", icon: Circle },
    { id: "text", label: "Text", icon: Type },
  ];

  return (
    <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3"><Link href="/" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Back to toolbox"><ArrowLeft size={20} /></Link><div><h1 className="font-bold">Quick Whiteboard</h1><p className="text-xs text-slate-500">Local autosave · no account needed {saved && <span className="text-emerald-600">· Saved</span>}</p></div></div>
        <div className="flex items-center gap-1"><button onClick={undo} disabled={!operationsRef.current.length} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30" title="Undo (Ctrl+Z)"><Undo2 size={19} /></button><button onClick={redo} disabled={!redoStack.length} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30" title="Redo (Ctrl+Y)"><Redo2 size={19} /></button><button onClick={clearBoard} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Clear board"><RotateCcw size={19} /></button><button onClick={exportPng} className="ml-2 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Download size={17} /> Export PNG</button></div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3 md:w-20 md:flex-col md:border-b-0 md:border-r">
          {tools.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setTool(item.id)} className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${tool === item.id ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-100"}`} title={item.label} aria-label={item.label}><Icon size={20} /></button>; })}
          <div className="mx-1 h-8 w-px bg-slate-200 md:my-1 md:h-px md:w-10" />
          <label className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow ring-1 ring-slate-300" title="Color"><span className="absolute inset-0" style={{ backgroundColor: color }} /><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
        </aside>

        <section className="relative min-h-0 flex-1 p-3 md:p-5">
          <div className="absolute left-1/2 top-6 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="flex gap-1">{colors.map((item) => <button key={item} onClick={() => setColor(item)} className={`h-6 w-6 rounded-full border-2 ${color === item ? "border-slate-900" : "border-white ring-1 ring-slate-200"}`} style={{ backgroundColor: item }} aria-label={`Use ${item}`} />)}</div>
            <div className="h-6 w-px bg-slate-200" /><label className="flex items-center gap-2 text-xs text-slate-500">Size<input type="range" min="2" max="16" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-20" /></label>
            {tool === "text" && <input value={text} onChange={(event) => setText(event.target.value)} maxLength={80} placeholder="Text to place" className="w-32 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500" />}
          </div>
          <div ref={wrapperRef} className="h-full min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40" style={{ backgroundImage: "radial-gradient(#d7dee8 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
            <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} className="h-full w-full touch-none" style={{ cursor: toolCursor(tool) }} aria-label="Drawing canvas" />
          </div>
        </section>
      </div>
    </main>
  );
}
