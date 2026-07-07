import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Send, Bot, User, Loader2 } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type HomeOption = { id: string; name: string; home_type: string; year_built: number | null; square_feet: number | null; hvac_type: string | null; city: string; state: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/energy-advisor-chat`;

async function streamChat(messages: ChatMessage[], homeContext: string, onDelta: (t: string) => void, onDone: () => void) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, homeContext }),
  });
  if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

export default function EnergyAdvisor() {
  const { user } = useAuth();
  const [homes, setHomes] = useState<HomeOption[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! Tell me a bit about what you're paying for utilities, or just ask me where to start — I'll give you specific upgrades with real cost and payback numbers, not generic tips." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("homes")
        .select("id, name, home_type, year_built, square_feet, hvac_type, city, state")
        .eq("user_id", user.id);
      const list = (data as HomeOption[]) || [];
      setHomes(list);
      if (list.length > 0) setSelectedHomeId(list[0].id);
    })();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const homeContext = (() => {
    const h = homes.find((x) => x.id === selectedHomeId);
    if (!h) return "";
    return [
      `Home type: ${h.home_type}`,
      h.year_built ? `Built: ${h.year_built}` : null,
      h.square_feet ? `Size: ${h.square_feet} sq ft` : null,
      h.hvac_type ? `HVAC: ${h.hvac_type}` : null,
      h.city && h.state ? `Location: ${h.city}, ${h.state}` : null,
    ].filter(Boolean).join(". ");
  })();

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      await streamChat(
        [...messages, userMsg],
        homeContext,
        (delta) => setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + delta };
          return next;
        }),
        () => setStreaming(false),
      );
    } catch {
      setStreaming(false);
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="text-primary" size={22} />
            <h1 className="text-2xl font-display font-bold">Energy & Utility Savings Advisor</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Get prioritized upgrades with real cost, savings, and payback estimates for your home.
          </p>

          {homes.length > 1 && (
            <div className="mb-4 max-w-xs">
              <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                <SelectTrigger><SelectValue placeholder="Select a home" /></SelectTrigger>
                <SelectContent>
                  {homes.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[55vh]" ref={scrollRef}>
                <div className="p-4 space-y-4">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role === "assistant" && <Bot size={18} className="text-primary shrink-0 mt-1" />}
                      <div className={`rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {m.content || (streaming && i === messages.length - 1 ? <Loader2 size={14} className="animate-spin" /> : "")}
                      </div>
                      {m.role === "user" && <User size={18} className="text-muted-foreground shrink-0 mt-1" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="border-t border-border p-3 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="e.g. My electric bill is $220/month, where should I start?"
                  disabled={streaming}
                />
                <Button onClick={send} disabled={streaming || !input.trim()}>
                  {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
