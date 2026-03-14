import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Plus, MessageCircle, Trash2, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { streamAI } from "@/lib/streamAI";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; updated_at: string };

const quickChips = [
  "Como adaptar uma prova de matemática?",
  "Estratégias para TDAH em sala",
  "Criar atividade de português adaptada",
  "Como fragmentar uma lista de exercícios?",
];

const WELCOME_MSG: Message = {
  role: "assistant",
  content:
    "Olá! Sou o assistente pedagógico do Orienta Aula. Posso ajudar com estratégias de adaptação, dúvidas sobre como usar a ferramenta e sugestões práticas para sala de aula.\n\n⚠️ Ferramenta pedagógica. Não diagnostica. Você decide.",
};

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      setMessages([WELCOME_MSG, ...data as Message[]]);
    } else {
      setMessages([WELCOME_MSG]);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    loadMessages(conv.id);
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([WELCOME_MSG]);
    setInput("");
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chat_conversations").delete().eq("id", convId);
    if (activeConvId === convId) startNewConversation();
    loadConversations();
  };

  const send = async (text: string) => {
    if (!text.trim() || loading || !user) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    let convId = activeConvId;

    // Create conversation if new
    if (!convId) {
      const title = text.trim().slice(0, 60);
      const { data } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title })
        .select("id")
        .single();
      if (data) {
        convId = data.id;
        setActiveConvId(convId);
      }
    }

    // Persist user message
    if (convId) {
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: "user",
        content: text.trim(),
      });
    }

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > allMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev.slice(0, allMessages.length), { role: "assistant", content: assistantSoFar }];
      });
    };

    const finalConvId = convId;

    streamAI({
      endpoint: "chat",
      body: {
        messages: allMessages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content })),
      },
      onDelta: (chunk) => upsertAssistant(chunk),
      onDone: async () => {
        setLoading(false);
        // Persist assistant message
        if (finalConvId && assistantSoFar) {
          await supabase.from("chat_messages").insert({
            conversation_id: finalConvId,
            role: "assistant",
            content: assistantSoFar,
          });
        }
        loadConversations();
      },
      onError: (err) => {
        setLoading(false);
        toast.error(err);
      },
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] gap-0 -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border bg-muted/30 flex flex-col shrink-0 min-w-0"
            style={{ overflow: "hidden", maxWidth: 220 }}
          >
            <div className="p-3 border-b border-border flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground truncate">Conversas</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={startNewConversation}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors group",
                      activeConvId === conv.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-background">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>
          <div>
            <h1 className="text-base font-bold text-foreground">Chat com IA</h1>
            <p className="text-[11px] text-muted-foreground">Ferramenta pedagógica · Não diagnostica · Você decide</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                    msg.role === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-card border border-border text-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>
                    ))
                  )}
                </div>
              </motion.div>
            ))}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        {/* Quick chips */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {quickChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-background">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Digite sua dúvida pedagógica..."
              disabled={loading}
              className="rounded-full"
            />
            <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon" className="rounded-full shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
