import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are the official WhatsApp customer service assistant for Amir Boutique, a premium women's fashion and jewelry store based in Pakistan.

STORE INFO:
- Store name: Amir Boutique
- Website: https://amirboutique.com
- Email: amirboutiqueofficialpk@gmail.com
- Currency: PKR (Pakistani Rupees)
- Country: Pakistan

PRODUCTS YOU SELL:
Women's 3-piece suits (shirt + trouser/plazo + dupatta):
- Fabrics available: Lawn, Cotton, Poly Lawn, Organza, Crinkle Chiffon, Silk, Net, Digital Silk, Digital Printed
- Styles: A-Line Shirt with Plazo, Straight Shirt with Plazo, Long Frock
- Sizes: S, M, L, XL
- Price range: PKR 4,890 to PKR 21,890

Sample products:
- ABL 1226 Baby Pink – Poly Lawn suit, A-Line with Plazo – PKR 14,500
- ABL 1248 Black – Cotton 3-piece with Digital Silk Dupatta – PKR 14,900
- ABL 1247 Lite Brown – Cotton A-Line with Plazo – PKR 13,900
- KB P298 Skin – Organza 4-piece set – PKR 19,890
- KB P307 Pista – Crinkle Chiffon Long Frock with Silk Trouser – PKR 21,890
- M23 Series (1-7) – Lawn printed suits – PKR 4,890 each

Jewelry sets:
- Amber Citrine Statement Necklace Set JW279 – PKR 3,490
- Champagne Gold Pearl Statement Set JW345 – PKR 4,190
- Amber Citrine Pearl Heritage Set JW390 – PKR 4,990

POLICIES (use sensible defaults if not confirmed):
- Delivery: All across Pakistan
- COD (Cash on Delivery): Available
- Returns: Exchange only within 3 days of delivery if item is unused and in original condition
- Sizing: S, M, L, XL available on most suits

HOW TO RESPOND:
- Greet warmly on first message
- Answer questions about products, pricing, sizes, fabric, delivery
- If customer asks about a specific product or image: describe the closest match and give the website link
- If asked about order status: say you'll check and get back to them
- If you genuinely don't know something: say "hum check karke aapko bata dein ge" or "we'll confirm and get back to you shortly"
- Always offer to help with anything else
- Direct to website for full catalog: amirboutique.com

LANGUAGE RULES — THIS IS CRITICAL:
- If customer writes in English → reply in English
- If customer writes in Roman Urdu → reply in Roman Urdu (e.g. "Kya price hai?" → reply in Roman Urdu)
- If customer mixes both → mix both naturally
- Sound like a real Pakistani boutique staff member, warm and helpful
- Use natural Pakistani expressions like "ji", "bilkul", "zaroor", "shukriya" when in Urdu mode
- Never sound robotic or formal

TONE: Warm, friendly, helpful — like a real boutique sales assistant texting on WhatsApp.`;

const MAKE_CONFIG = {
  webhook: {
    title: "Module 1 — Webhooks: Custom Webhook",
    steps: [
      "In Make.com, create a new Scenario",
      "Add module: Webhooks → Custom Webhook",
      'Click "Add" to create a new webhook, name it "Zoko WhatsApp"',
      "Copy the webhook URL Make.com gives you",
      "In Zoko dashboard → Settings → Webhooks → paste that URL",
      "Set trigger to: Incoming Messages",
    ],
  },
  filter: {
    title: "Filter (between Module 1 and 2)",
    steps: [
      'Click the wrench icon between modules → "Set up a filter"',
      "Label: Image OR Text (we handle both)",
      "Condition: message type EXISTS (leave blank to pass all messages)",
      "This lets ALL messages through — the AI handles everything",
    ],
  },
  http: {
    title: "Module 2 — HTTP: Make a Request (Claude API)",
    fields: {
      URL: "https://api.anthropic.com/v1/messages",
      Method: "POST",
      "Header 1 — Name": "x-api-key",
      "Header 1 — Value": "YOUR_ANTHROPIC_API_KEY",
      "Header 2 — Name": "anthropic-version",
      "Header 2 — Value": "2023-06-01",
      "Header 3 — Name": "Content-Type",
      "Header 3 — Value": "application/json",
      "Body type": "Raw",
      "Content type": "JSON (application/json)",
    },
    body: `{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 500,
  "system": "PASTE_SYSTEM_PROMPT_HERE",
  "messages": [
    {
      "role": "user",
      "content": "{{1.message.text}}"
    }
  ]
}`,
  },
  zoko: {
    title: "Module 3 — HTTP: Send Reply via Zoko",
    fields: {
      URL: "https://chat.zoko.io/v2/message",
      Method: "POST",
      "Header 1 — Name": "apikey",
      "Header 1 — Value": "YOUR_ZOKO_API_KEY",
      "Header 2 — Name": "Content-Type",
      "Header 2 — Value": "application/json",
      "Body type": "Raw",
    },
    body: `{
  "channel": "whatsapp",
  "recipient": "{{1.message.sender}}",
  "type": "text",
  "message": "{{2.content[].text}}"
}`,
  },
};

export default function App() {
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Assalam o Alaikum! 👗 Welcome to Amir Boutique. Main aapki kaise madad kar sakti hoon? (or type in English — I speak both!)",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [expandedSection, setExpandedSection] = useState("webhook");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      const data = await res.json();
      const reply =
        data?.content?.[0]?.text ||
        "Sorry, kuch masla ho gaya. Please dobara try karein.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Connection error. Please try again.",
        },
      ]);
    }
    setLoading(false);
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const CopyBtn = ({ text, label }) => (
    <button
      onClick={() => copyText(text, label)}
      style={{
        background: copied === label ? "#16a34a" : "var(--color-background-secondary)",
        color: copied === label ? "#fff" : "var(--color-text-secondary)",
        border: "1px solid var(--color-border-tertiary)",
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        transition: "all 0.2s",
      }}
    >
      {copied === label ? "✓ Copied" : "Copy"}
    </button>
  );

  const sampleQuestions = [
    "Kya sizes available hain?",
    "Cotton suit ka price kya hai?",
    "Do you deliver to Lahore?",
    "Koi pink suit hai?",
    "COD available hai?",
    "Jewelry sets kitne ka hai?",
  ];

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 780, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        borderRadius: 16,
        padding: "24px 28px",
        marginBottom: 0,
        color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>👗</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>Amir Boutique — WhatsApp AI Agent</div>
            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 2 }}>
              amirboutique.com · English + Roman Urdu · Powered by Claude
            </div>
          </div>
          <div style={{
            marginLeft: "auto",
            background: "#25D366",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", display: "inline-block" }}></span>
            WhatsApp Ready
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid var(--color-border-tertiary)",
        marginBottom: 0,
        background: "var(--color-background-secondary)",
        borderRadius: "0 0 0 0",
      }}>
        {[
          { id: "chat", label: "💬 Live Test Chat" },
          { id: "setup", label: "⚙️ Make.com Setup" },
          { id: "prompt", label: "🧠 AI System Prompt" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "13px 20px",
              border: "none",
              background: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              cursor: "pointer",
              fontWeight: tab === t.id ? 500 : 400,
              color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderBottom: tab === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
              marginBottom: -1,
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {tab === "chat" && (
        <div style={{ border: "1px solid var(--color-border-tertiary)", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
          <div style={{
            background: "#075E54",
            padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#128C7E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👗</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>Amir Boutique</div>
              <div style={{ color: "#B2DFDB", fontSize: 12 }}>online</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            height: 380,
            overflowY: "auto",
            padding: "16px 14px",
            background: "#ECE5DD",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "72%",
                  background: m.role === "user" ? "#DCF8C6" : "#fff",
                  borderRadius: m.role === "user" ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                  padding: "8px 12px",
                  fontSize: 14,
                  color: "#111",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                  <div style={{ fontSize: 10, color: "#888", textAlign: "right", marginTop: 4 }}>
                    {new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  background: "#fff",
                  borderRadius: "2px 12px 12px 12px",
                  padding: "10px 14px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map((d) => (
                      <div key={d} style={{
                        width: 7, height: 7, borderRadius: "50%", background: "#aaa",
                        animation: "bounce 1.2s infinite",
                        animationDelay: `${d * 0.2}s`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sample questions */}
          <div style={{
            background: "#f8f8f8",
            padding: "8px 14px",
            display: "flex", gap: 6, flexWrap: "wrap",
            borderTop: "1px solid #ddd",
          }}>
            {sampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                style={{
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 14,
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  color: "#333",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            background: "#f0f0f0",
            padding: "10px 12px",
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a customer message to test..."
              style={{
                flex: 1,
                border: "none",
                borderRadius: 20,
                padding: "10px 16px",
                fontSize: 14,
                fontFamily: "var(--font-sans)",
                outline: "none",
                background: "#fff",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: 42, height: 42,
                borderRadius: "50%",
                background: loading ? "#888" : "#25D366",
                border: "none",
                color: "#fff",
                fontSize: 18,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Make.com Setup Tab */}
      {tab === "setup" && (
        <div style={{ border: "1px solid var(--color-border-tertiary)", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{
              background: "var(--color-background-secondary)",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              color: "var(--color-text-secondary)",
              borderLeft: "3px solid #25D366",
            }}>
              📋 Your Make.com scenario needs 3 modules. Set them up in order below. Click each section to expand.
            </div>
          </div>

          {[
            {
              key: "webhook",
              icon: "🔗",
              title: "Module 1 — Zoko Webhook (Trigger)",
              color: "#25D366",
              content: (
                <div>
                  <ol style={{ paddingLeft: 18, margin: 0, lineHeight: 2, color: "var(--color-text-primary)", fontSize: 14 }}>
                    {MAKE_CONFIG.webhook.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              ),
            },
            {
              key: "http",
              icon: "🧠",
              title: "Module 2 — HTTP Request to Claude AI",
              color: "#6366f1",
              content: (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Set these fields in the HTTP module:</div>
                  {Object.entries(MAKE_CONFIG.http.fields).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 220, fontSize: 13, color: "var(--color-text-secondary)" }}>{k}</div>
                      <div style={{
                        flex: 1,
                        background: "var(--color-background-secondary)",
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border-tertiary)",
                        wordBreak: "break-all",
                      }}>{v}</div>
                      <CopyBtn text={v} label={k} />
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                      Body (Raw JSON) — paste this then replace PASTE_SYSTEM_PROMPT_HERE with the text from the "AI System Prompt" tab:
                    </div>
                    <div style={{ position: "relative" }}>
                      <pre style={{
                        background: "var(--color-background-secondary)",
                        borderRadius: 8,
                        padding: 14,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        overflowX: "auto",
                        border: "1px solid var(--color-border-tertiary)",
                        margin: 0,
                        color: "var(--color-text-primary)",
                        lineHeight: 1.6,
                      }}>{MAKE_CONFIG.http.body}</pre>
                      <div style={{ position: "absolute", top: 8, right: 8 }}>
                        <CopyBtn text={MAKE_CONFIG.http.body} label="http-body" />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "zoko",
              icon: "📤",
              title: "Module 3 — Send Reply via Zoko",
              color: "#f59e0b",
              content: (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(MAKE_CONFIG.zoko.fields).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 220, fontSize: 13, color: "var(--color-text-secondary)" }}>{k}</div>
                      <div style={{
                        flex: 1,
                        background: "var(--color-background-secondary)",
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border-tertiary)",
                      }}>{v}</div>
                      <CopyBtn text={v} label={k} />
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Body (Raw JSON):</div>
                    <div style={{ position: "relative" }}>
                      <pre style={{
                        background: "var(--color-background-secondary)",
                        borderRadius: 8,
                        padding: 14,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        overflowX: "auto",
                        border: "1px solid var(--color-border-tertiary)",
                        margin: 0,
                        color: "var(--color-text-primary)",
                        lineHeight: 1.6,
                      }}>{MAKE_CONFIG.zoko.body}</pre>
                      <div style={{ position: "absolute", top: 8, right: 8 }}>
                        <CopyBtn text={MAKE_CONFIG.zoko.body} label="zoko-body" />
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, color: "var(--color-text-secondary)" }}>
                      💡 <code>{"{{1.message.sender}}"}</code> = customer's WhatsApp number from Zoko
                      <br />💡 <code>{"{{2.content[].text}}"}</code> = Claude's reply from Module 2
                    </div>
                  </div>
                </div>
              ),
            },
          ].map((section) => (
            <div key={section.key} style={{
              border: "1px solid var(--color-border-tertiary)",
              borderRadius: 10,
              marginBottom: 12,
              overflow: "hidden",
            }}>
              <button
                onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: expandedSection === section.key ? "var(--color-background-secondary)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span style={{ fontSize: 20 }}>{section.icon}</span>
                <span style={{ fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)", flex: 1 }}>{section.title}</span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: 16 }}>
                  {expandedSection === section.key ? "▲" : "▼"}
                </span>
              </button>
              {expandedSection === section.key && (
                <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--color-border-tertiary)" }}>
                  <div style={{ paddingTop: 14 }}>{section.content}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* System Prompt Tab */}
      {tab === "prompt" && (
        <div style={{ border: "1px solid var(--color-border-tertiary)", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>Your AI System Prompt</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Copy this and paste it into Module 2's body where it says PASTE_SYSTEM_PROMPT_HERE
              </div>
            </div>
            <CopyBtn text={SYSTEM_PROMPT} label="system-prompt" />
          </div>
          <pre style={{
            background: "var(--color-background-secondary)",
            borderRadius: 10,
            padding: 16,
            fontSize: 12.5,
            fontFamily: "var(--font-mono)",
            overflowX: "auto",
            border: "1px solid var(--color-border-tertiary)",
            margin: 0,
            color: "var(--color-text-primary)",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            maxHeight: 500,
            overflowY: "auto",
          }}>{SYSTEM_PROMPT}</pre>
          <div style={{
            marginTop: 16,
            background: "var(--color-background-secondary)",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 13,
            color: "var(--color-text-secondary)",
            borderLeft: "3px solid #6366f1",
          }}>
            ✏️ Want to update the prompt? Just tell me — e.g. "add that we don't do returns", "add our delivery charges", or "add our WhatsApp number". I'll update it instantly.
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
