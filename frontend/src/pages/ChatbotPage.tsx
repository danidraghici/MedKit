import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Download,
  Trash2,
  Plus,
  MessageSquare,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  UserCircle,
  ChevronDown,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { analyzeKidneyStoneSymptoms, generateWelcomeMessage } from "@/lib/aiService";
import { formatDateTime, getInitials } from "@/lib/utils";
import jsPDF from "jspdf";

interface ChatbotPageProps {
  onNavigate?: (page: string) => void;
}

// Simple markdown renderer for chat messages
function MarkdownContent({ content }: { content: string }) {
  const renderLine = (line: string, idx: number) => {
    // Heading 2
    if (line.startsWith("## ")) {
      return <h3 key={idx} className="font-bold text-base mt-3 mb-1 text-foreground">{line.slice(3)}</h3>;
    }
    // Heading 3
    if (line.startsWith("### ")) {
      return <h4 key={idx} className="font-semibold text-sm mt-2.5 mb-1 text-foreground">{line.slice(4)}</h4>;
    }
    // Horizontal rule
    if (line === "---") {
      return <hr key={idx} className="my-2 border-border" />;
    }
    // Blockquote
    if (line.startsWith("> ")) {
      return (
        <blockquote key={idx} className="border-l-4 border-amber-400 bg-amber-50/80 dark:bg-amber-950/30 pl-3 pr-2 py-1.5 my-2 rounded-r-md text-xs text-amber-800 dark:text-amber-300">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      const rest = line.replace(/^\d+\.\s/, "");
      return (
        <div key={idx} className="flex gap-2 my-0.5">
          <span className="text-primary font-medium shrink-0 text-xs w-5">{num}.</span>
          <span className="text-sm">{renderInline(rest)}</span>
        </div>
      );
    }
    // Bullet list
    if (line.startsWith("- ") || line.startsWith("• ")) {
      return (
        <div key={idx} className="flex gap-2 my-0.5">
          <span className="text-primary shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-current inline-block" />
          <span className="text-sm">{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    // Empty line
    if (line.trim() === "") {
      return <div key={idx} className="h-1" />;
    }
    // Normal paragraph
    return <p key={idx} className="text-sm my-0.5">{renderInline(line)}</p>;
  };

  const renderInline = (text: string): React.ReactNode => {
    // Bold text: **text** or text surrounded by **
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const lines = content.split("\n");
  return <div className="space-y-0">{lines.map((line, idx) => renderLine(line, idx))}</div>;
}

export default function ChatbotPage({ onNavigate }: ChatbotPageProps) {
  const chatSessions = useAppStore((s) => s.chatSessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const startChatSession = useAppStore((s) => s.startChatSession);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const getChatSession = useAppStore((s) => s.getChatSession);
  const patients = useAppStore((s) => s.patients);
  const addMedicalRecord = useAppStore((s) => s.addMedicalRecord);
  const user = useAppStore((s) => s.user);

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachToPatientDialog, setAttachToPatientDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(currentSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const session = sessionId ? getChatSession(sessionId) : null;
  const messages = session?.messages ?? [];

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Start session with welcome message on mount
  useEffect(() => {
    if (!sessionId) {
      const newSessionId = startChatSession();
      setSessionId(newSessionId);
      setTimeout(() => {
        addChatMessage(newSessionId, {
          role: "assistant",
          content: generateWelcomeMessage(),
        });
      }, 100);
    }
  }, []);

  const handleNewSession = () => {
    const newSessionId = startChatSession();
    setSessionId(newSessionId);
    addChatMessage(newSessionId, {
      role: "assistant",
      content: generateWelcomeMessage(),
    });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping || !sessionId) return;
    const userMsg = inputValue.trim();
    setInputValue("");

    addChatMessage(sessionId, { role: "user", content: userMsg });
    setIsTyping(true);

    try {
      const response = await analyzeKidneyStoneSymptoms(userMsg);
      addChatMessage(sessionId, { role: "assistant", content: response });
    } catch {
      addChatMessage(sessionId, {
        role: "assistant",
        content: "A apărut o eroare la procesarea cererii. Vă rugăm încercați din nou.",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportAsPDF = () => {
    if (!session || messages.length === 0) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Kidney Stone Clinical Decision Support — Chat Export", margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 5;
    doc.text(`Session ID: ${session.id}`, margin, yPos);
    yPos += 5;
    doc.text(`Clinician: ${user?.name ?? "Unknown"}`, margin, yPos);
    yPos += 8;

    // Disclaimer
    doc.setFillColor(255, 243, 205);
    doc.rect(margin, yPos, contentWidth, 10, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      "DISCLAIMER: This is a clinical decision-support tool. Content should not be used as a definitive diagnosis.",
      margin + 2,
      yPos + 6
    );
    yPos += 14;

    doc.setFontSize(10);

    messages.forEach((msg) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }

      const role = msg.role === "user" ? "CLINICIAN" : "AI ASSISTANT";
      const timestamp = formatDateTime(msg.timestamp);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${role} — ${timestamp}`, margin, yPos);
      yPos += 5;

      // Clean markdown for PDF
      const cleanContent = msg.content
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/^#{1,3}\s/gm, "")
        .replace(/^>\s/gm, "NOTICE: ")
        .replace(/---/g, "----------");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(cleanContent, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 4.5 + 6;
    });

    doc.save(`medkit-chat-export-${Date.now()}.pdf`);
  };

  const attachToPatient = () => {
    if (!selectedPatientId || !session) return;

    const conversationText = messages
      .map((m) => `[${m.role === "user" ? "Clinician" : "AI"}]: ${m.content}`)
      .join("\n\n---\n\n");

    addMedicalRecord({
      patientId: selectedPatientId,
      date: new Date().toISOString().split("T")[0],
      doctor: user?.name ?? "Unknown",
      visitType: "Telemedicină",
      chiefComplaint: "AI-assisted consultation",
      diagnosis: "AI Kidney Stone Decision Support Consultation",
      symptoms: "See attached chatbot consultation transcript",
      treatment: `AI-generated clinical assessment attached. See full consultation below:\n\n${conversationText.slice(0, 2000)}`,
      prescribedDrugs: [],
      urgency: "Rutină",
      attachments: [],
    });

    setAttachToPatientDialog(false);
    setSelectedPatientId("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px] bg-card rounded-2xl border border-border overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Asistent AI - Calculi renali</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Suport decizional clinic activ</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsPDF}
            disabled={messages.length === 0}
            className="gap-1.5 text-xs hidden sm:flex"
          >
            <Download className="w-3.5 h-3.5" />
            Descarcă PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAttachToPatientDialog(true)}
            disabled={messages.length === 0}
            className="gap-1.5 text-xs hidden sm:flex"
          >
            <Paperclip className="w-3.5 h-3.5" />
            Atașează la pacient
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNewSession} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Conversație nouă
          </Button>
        </div>
      </div>

      {/* Mobile actions bar */}
      <div className="flex sm:hidden items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 shrink-0">
        <Button variant="outline" size="sm" onClick={exportAsPDF} disabled={messages.length === 0} className="gap-1.5 text-xs flex-1">
          <Download className="w-3.5 h-3.5" /> Descarcă PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAttachToPatientDialog(true)} disabled={messages.length === 0} className="gap-1.5 text-xs flex-1">
          <Paperclip className="w-3.5 h-3.5" /> Atașează
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div className="shrink-0">
              {message.role === "assistant" ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              ) : (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                    {user ? getInitials(user.name) : "DR"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* Message bubble */}
            <div className={`flex-1 max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm relative group ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 border border-border rounded-tl-sm"
                }`}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <MarkdownContent content={message.content} />
                )}

                {/* Copy button on hover */}
                <button
                  onClick={() => copyMessage(message.id, message.content)}
                  className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    message.role === "user"
                      ? "text-primary-foreground/70 hover:text-primary-foreground bg-primary-foreground/10"
                      : "text-muted-foreground hover:text-foreground bg-background/80"
                  }`}
                  title="Copiază mesajul"
                >
                  {copiedId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {formatDateTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted/50 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Se analizează simptomele...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer Banner */}
      <div className="px-4 py-2 bg-amber-50/80 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800 shrink-0">
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Instrument de suport decizional clinic.</strong> Evaluările AI trebuie validate de un clinician calificat. Nu se utilizează ca diagnostic.
          </span>
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border bg-background shrink-0">
        {/* Suggestion chips */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[
              "54yo male, severe right flank pain radiating to groin, hematuria, nausea",
              "Patient has fever + flank pain + cloudy urine, possible infected stone",
              "CT shows 6mm stone in left ureter with hydronephrosis, patient in pain",
              "Recurrent kidney stones, gout history, low urine pH",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputValue(suggestion)}
                className="text-xs px-2.5 py-1 bg-muted hover:bg-muted/80 rounded-full border border-border transition-colors text-left line-clamp-1 max-w-[200px] text-muted-foreground hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descrieți simptomele pacientului (localizarea durerii, culoarea urinei, rezultate imagistice, analize...)&#10;Apăsați Enter pentru a trimite, Shift+Enter pentru linie nouă"
            className="resize-none text-sm min-h-[80px] max-h-[160px] flex-1"
            rows={3}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="h-10 w-10 p-0 shrink-0"
            title="Trimite mesajul"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Shift+Enter pentru linie nouă · Enter pentru trimitere
        </p>
      </div>

      {/* Attach to Patient Dialog */}
      <Dialog open={attachToPatientDialog} onOpenChange={setAttachToPatientDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Atașează consultația la pacient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Se va crea o nouă fișă medicală cu transcriptul complet al conversației atașat pacientului selectat.
            </p>
            <div className="space-y-1.5">
              <Label>Selectați pacientul</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Alegeți un pacient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAttachToPatientDialog(false)}>Anulează</Button>
            <Button onClick={attachToPatient} disabled={!selectedPatientId}>
              Atașează la fișă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
