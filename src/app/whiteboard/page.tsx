"use client";

import Link from "next/link";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowUpRight, Circle, Download, Eraser, Highlighter, Minus,
  MousePointer2, Pencil, Redo2, RotateCcw, Square, Trash2, Type, Undo2,
} from "lucide-react";

type Point = { x: number; y: number };
type DrawTool = "select" | "pen" | "highlighter" | "eraser" | "line" | "arrow" | "rectangle" | "ellipse" | "text";
type Operation = { tool: DrawTool; color: string; width: number; points: Point[]; text?: string };
type Bounds = { left: number; top: number; right: number; bottom: number };
type TextEditor = { x: number; y: number; value: string; editingIndex: number | null };

const STORAGE_KEY = "steven-toolbox-whiteboard-v1";
const colors = ["#111827", "#2563eb", "#7c3aed", "#dc2626", "#ea580c", "#16a34a"];
const cloneOperations = (operations: Operation[]) => operations.map((operation) => ({ ...operation, points: operation.points.map((point) => ({ ...point })) }));

function operationBounds(operation: Operation): Bounds {
  const xs = operation.points.map((point) => point.x);
  const ys = operation.points.map((point) => point.y);
  const left = Math.min(...xs); let right = Math.max(...xs); let top = Math.min(...ys); let bottom = Math.max(...ys);
  if (operation.tool === "text" && operation.text) {
    const fontSize = Math.max(16, operation.width * 5);
    const lines = operation.text.split("\n");
    right = left + Math.max(...lines.map((line) => line.length), 1) * fontSize * 0.62;
    top -= fontSize;
    bottom += (lines.length - 1) * fontSize * 1.25;
  }
  const padding = Math.max(6, operation.width / 2);
  return { left: left - padding, top: top - padding, right: right + padding, bottom: bottom + padding };
}

function cursorFor(tool: DrawTool, hasSelection: boolean) {
  if (tool === "select") return hasSelection ? "move" : "default";
  if (tool === "text") return "text";
  if (tool === "eraser") return "cell";
  return "crosshair";
}

export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const operationsRef = useRef<Operation[]>([]);
  const currentRef = useRef<Operation | null>(null);
  const drawStartSnapshotRef = useRef<Operation[]>([]);
  const pastRef = useRef<Operation[][]>([]);
  const futureRef = useRef<Operation[][]>([]);
  const selectedIndexRef = useRef(-1);
  const selectionDragRef = useRef<{ start: Point; originalPoints: Point[]; previous: Operation[]; moved: boolean } | null>(null);
  const cancelTextRef = useRef(false);

  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState(colors[0]);
  const [width, setWidth] = useState(4);
  const [selectedIndex, setSelectedIndexState] = useState(-1);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [textEditor, setTextEditor] = useState<TextEditor | null>(null);
  const [saved, setSaved] = useState(false);

  const drawOperation = useCallback((context: CanvasRenderingContext2D, operation: Operation) => {
    const start = operation.points[0];
    const end = operation.points.at(-1) ?? start;
    if (!start) return;
    context.save();
    context.lineCap = "round"; context.lineJoin = "round"; context.lineWidth = operation.width;
    context.strokeStyle = operation.tool === "eraser" ? "#ffffff" : operation.color;
    context.fillStyle = operation.color;
    context.globalAlpha = operation.tool === "highlighter" ? 0.3 : 1;

    if (["pen", "highlighter", "eraser"].includes(operation.tool)) {
      context.beginPath(); context.moveTo(start.x, start.y);
      operation.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    } else if (operation.tool === "line" || operation.tool === "arrow") {
      context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
      if (operation.tool === "arrow") {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const head = Math.max(12, operation.width * 4);
        context.beginPath();
        context.moveTo(end.x, end.y);
        context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
        context.moveTo(end.x, end.y);
        context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
        context.stroke();
      }
    } else if (operation.tool === "rectangle") {
      context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (operation.tool === "ellipse") {
      context.beginPath();
      context.ellipse((start.x + end.x) / 2, (start.y + end.y) / 2, Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 2, 0, 0, Math.PI * 2);
      context.stroke();
    } else if (operation.tool === "text" && operation.text) {
      const fontSize = Math.max(16, operation.width * 5);
      context.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      operation.text.split("\n").forEach((line, index) => context.fillText(line || " ", start.x, start.y + index * fontSize * 1.25));
    }
    context.restore();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#dbe3ee";
    for (let x = 12; x < canvas.width; x += 24) for (let y = 12; y < canvas.height; y += 24) context.fillRect(x, y, 1.5, 1.5);
    operationsRef.current.forEach((operation) => drawOperation(context, operation));
    if (currentRef.current) drawOperation(context, currentRef.current);

    const selected = operationsRef.current[selectedIndexRef.current];
    if (selected) {
      const bounds = operationBounds(selected);
      context.save(); context.strokeStyle = "#2563eb"; context.lineWidth = 1.5; context.setLineDash([6, 4]);
      context.strokeRect(bounds.left - 4, bounds.top - 4, bounds.right - bounds.left + 8, bounds.bottom - bounds.top + 8);
      context.setLineDash([]); context.fillStyle = "#ffffff";
      [[bounds.left - 4, bounds.top - 4], [bounds.right + 4, bounds.top - 4], [bounds.left - 4, bounds.bottom + 4], [bounds.right + 4, bounds.bottom + 4]].forEach(([x, y]) => { context.fillRect(x - 3, y - 3, 6, 6); context.strokeRect(x - 3, y - 3, 6, 6); });
      context.restore();
    }
  }, [drawOperation]);

  function selectIndex(index: number) {
    selectedIndexRef.current = index;
    setSelectedIndexState(index);
    window.requestAnimationFrame(redraw);
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operationsRef.current));
    setSaved(true); window.setTimeout(() => setSaved(false), 900);
    setHistoryVersion((version) => version + 1);
    window.requestAnimationFrame(redraw);
  }

  function commitChange(previous: Operation[]) {
    pastRef.current.push(previous);
    futureRef.current = [];
    persist();
  }

  function undo() {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(cloneOperations(operationsRef.current));
    operationsRef.current = previous;
    selectIndex(-1); persist();
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(cloneOperations(operationsRef.current));
    operationsRef.current = next;
    selectIndex(-1); persist();
  }

  function deleteSelected() {
    const index = selectedIndexRef.current;
    if (index < 0) return;
    const previous = cloneOperations(operationsRef.current);
    operationsRef.current.splice(index, 1);
    selectIndex(-1); commitChange(previous);
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) operationsRef.current = JSON.parse(stored) as Operation[];
    } catch { /* Ignore invalid local drafts. */ }
    setHistoryVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current; const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const resize = () => {
      const bounds = wrapper.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(bounds.width)); canvas.height = Math.max(1, Math.floor(bounds.height)); redraw();
    };
    resize(); const observer = new ResizeObserver(resize); observer.observe(wrapper);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [historyVersion, redraw]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea")) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIndexRef.current >= 0) { event.preventDefault(); deleteSelected(); return; }
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z") { event.preventDefault(); undo(); }
      if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function hitTest(point: Point) {
    for (let index = operationsRef.current.length - 1; index >= 0; index -= 1) {
      const bounds = operationBounds(operationsRef.current[index]);
      if (point.x >= bounds.left - 8 && point.x <= bounds.right + 8 && point.y >= bounds.top - 8 && point.y <= bounds.bottom + 8) return index;
    }
    return -1;
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = pointFromEvent(event);
    if (tool === "select") {
      const index = hitTest(point); selectIndex(index);
      if (index >= 0) selectionDragRef.current = { start: point, originalPoints: cloneOperations([operationsRef.current[index]])[0].points, previous: cloneOperations(operationsRef.current), moved: false };
      return;
    }
    if (tool === "text") {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    selectIndex(-1);
    drawStartSnapshotRef.current = cloneOperations(operationsRef.current);
    currentRef.current = { tool, color, width: tool === "eraser" ? width * 4 : tool === "highlighter" ? width * 3 : width, points: [point] };
  }

  function continueDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = pointFromEvent(event);
    if (tool === "select" && selectionDragRef.current && selectedIndexRef.current >= 0) {
      const drag = selectionDragRef.current;
      const dx = point.x - drag.start.x; const dy = point.y - drag.start.y;
      drag.moved ||= Math.abs(dx) + Math.abs(dy) > 2;
      operationsRef.current[selectedIndexRef.current].points = drag.originalPoints.map((original) => ({ x: original.x + dx, y: original.y + dy }));
      redraw(); return;
    }
    if (!currentRef.current) return;
    if (["pen", "highlighter", "eraser"].includes(currentRef.current.tool)) currentRef.current.points.push(point);
    else currentRef.current.points[1] = point;
    redraw();
  }

  function finishDrawing() {
    if (selectionDragRef.current) {
      const drag = selectionDragRef.current; selectionDragRef.current = null;
      if (drag.moved) commitChange(drag.previous); else redraw();
      return;
    }
    if (!currentRef.current) return;
    operationsRef.current.push(currentRef.current); currentRef.current = null;
    commitChange(drawStartSnapshotRef.current);
  }

  function editText(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool !== "select") return;
    const index = hitTest(pointFromEvent(event)); const operation = operationsRef.current[index];
    if (!operation || operation.tool !== "text") return;
    selectIndex(index); cancelTextRef.current = false;
    setTextEditor({ x: operation.points[0].x, y: operation.points[0].y, value: operation.text ?? "", editingIndex: index });
  }

  function placeText(event: ReactMouseEvent<HTMLCanvasElement>) {
    if (tool !== "text" || textEditor) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    selectIndex(-1); cancelTextRef.current = false;
    setTextEditor({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, value: "", editingIndex: null });
  }

  function commitText() {
    if (!textEditor || cancelTextRef.current) { cancelTextRef.current = false; setTextEditor(null); return; }
    const value = textEditor.value.trimEnd();
    if (!value.trim()) { setTextEditor(null); return; }
    const previous = cloneOperations(operationsRef.current);
    if (textEditor.editingIndex === null) {
      operationsRef.current.push({ tool: "text", color, width, points: [{ x: textEditor.x, y: textEditor.y }], text: value });
      selectIndex(operationsRef.current.length - 1);
    } else {
      operationsRef.current[textEditor.editingIndex].text = value;
      selectIndex(textEditor.editingIndex);
    }
    setTextEditor(null); commitChange(previous);
  }

  function clearBoard() {
    if (!operationsRef.current.length || !window.confirm("Clear the entire whiteboard?")) return;
    const previous = cloneOperations(operationsRef.current); operationsRef.current = [];
    selectIndex(-1); commitChange(previous);
  }

  function exportPng() {
    const canvas = canvasRef.current; if (!canvas) return;
    const anchor = document.createElement("a"); anchor.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    anchor.href = canvas.toDataURL("image/png"); anchor.click();
  }

  function chooseTool(nextTool: DrawTool) {
    setTool(nextTool);
    if (nextTool !== "select") selectIndex(-1);
  }

  const tools: Array<{ id: DrawTool; label: string; icon: typeof Pencil }> = [
    { id: "select", label: "Select and move", icon: MousePointer2 }, { id: "pen", label: "Pen", icon: Pencil },
    { id: "highlighter", label: "Highlighter", icon: Highlighter }, { id: "eraser", label: "Eraser", icon: Eraser },
    { id: "line", label: "Line", icon: Minus }, { id: "arrow", label: "Arrow", icon: ArrowUpRight },
    { id: "rectangle", label: "Rectangle", icon: Square }, { id: "ellipse", label: "Ellipse", icon: Circle },
    { id: "text", label: "Text", icon: Type },
  ];

  return (
    <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3"><Link href="/" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Back to toolbox"><ArrowLeft size={20} /></Link><div><h1 className="font-bold">Quick Whiteboard</h1><p className="text-xs text-slate-500">Local autosave · no account needed {saved && <span className="text-emerald-600">· Saved</span>}</p></div></div>
        <div className="flex items-center gap-1"><button onClick={undo} disabled={!pastRef.current.length} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30" title="Undo (Ctrl+Z)"><Undo2 size={19} /></button><button onClick={redo} disabled={!futureRef.current.length} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30" title="Redo (Ctrl+Y)"><Redo2 size={19} /></button>{selectedIndex >= 0 && <button onClick={deleteSelected} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Delete selected"><Trash2 size={19} /></button>}<button onClick={clearBoard} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Clear board"><RotateCcw size={19} /></button><button onClick={exportPng} className="ml-2 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Download size={17} /> Export PNG</button></div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="z-10 flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-200 bg-white p-2 md:w-20 md:flex-col md:border-b-0 md:border-r md:p-3">
          {tools.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => chooseTool(item.id)} className={`flex h-10 w-10 items-center justify-center rounded-xl transition md:h-11 md:w-11 ${tool === item.id ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-100"}`} title={item.label} aria-label={item.label}><Icon size={20} /></button>; })}
          <div className="mx-1 h-8 w-px bg-slate-200 md:my-1 md:h-px md:w-10" />
          <label className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow ring-1 ring-slate-300" title="Color"><span className="absolute inset-0" style={{ backgroundColor: color }} /><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
        </aside>

        <section className="relative min-h-0 flex-1 p-3 md:p-5">
          <div className="absolute left-1/2 top-6 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="flex gap-1">{colors.map((item) => <button key={item} onClick={() => setColor(item)} className={`h-6 w-6 rounded-full border-2 ${color === item ? "border-slate-900" : "border-white ring-1 ring-slate-200"}`} style={{ backgroundColor: item }} aria-label={`Use ${item}`} />)}</div>
            <div className="h-6 w-px bg-slate-200" /><label className="flex items-center gap-2 text-xs text-slate-500">{tool === "text" ? "Text size" : "Size"}<input type="range" min="2" max="16" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-20" /></label>
            {tool === "select" && <span className="text-xs text-slate-500">Drag to move · double-click text to edit</span>}
          </div>
          <div ref={wrapperRef} className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40">
            <canvas ref={canvasRef} onClick={placeText} onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} onDoubleClick={editText} className="h-full w-full touch-none" style={{ cursor: cursorFor(tool, selectedIndex >= 0) }} aria-label="Drawing canvas" />
            {textEditor && <textarea autoFocus value={textEditor.value} onChange={(event) => setTextEditor({ ...textEditor, value: event.target.value })} onBlur={commitText} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { cancelTextRef.current = true; setTextEditor(null); } }} placeholder="Type here…" className="absolute z-20 min-h-20 w-64 resize rounded-lg border-2 border-blue-500 bg-white/95 p-2 text-slate-900 shadow-xl outline-none" style={{ left: Math.min(textEditor.x, Math.max(8, (canvasRef.current?.width ?? 320) - 272)), top: Math.max(8, textEditor.y - Math.max(16, width * 5)), fontSize: Math.max(16, width * 5), lineHeight: 1.25 }} />}
          </div>
        </section>
      </div>
    </main>
  );
}
