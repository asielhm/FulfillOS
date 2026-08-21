"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LifeBuoy, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";

type Locale = "en" | "es";
type HelpTopic = {
  question: string;
  short: string;
  answer: string;
  href: string;
  action: string;
  keywords: string[];
};
type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  topic?: HelpTopic;
};

const topics: Record<Locale, HelpTopic[]> = {
  en: [
    {
      question: "How do I add a customer?",
      short: "Add a customer",
      answer:
        "Open Customers and choose Add customer. After saving, you can assign products, inbound shipments and work orders to that client.",
      href: "/customers/new",
      action: "Add customer",
      keywords: ["customer", "client", "add customer"],
    },
    {
      question: "How do I import products?",
      short: "Import products",
      answer:
        "Save the workbook as CSV or TSV, open Products → Import file, select the customer and map each spreadsheet column before importing.",
      href: "/products/import",
      action: "Import products",
      keywords: ["product", "sku", "excel", "csv", "import"],
    },
    {
      question: "How do I receive inventory?",
      short: "Receive inventory",
      answer:
        "Create an expected inbound shipment first. Open it to receive quantities and let FulfillOS identify shortages, overages, damage and delays.",
      href: "/inbound/new",
      action: "Create inbound",
      keywords: ["receive", "receiving", "inbound", "inventory", "shipment"],
    },
    {
      question: "How do I add personnel?",
      short: "Invite my team",
      answer:
        "Open Team to invite each employee with an individual account and role. Their identity becomes part of the Proof of Work chain.",
      href: "/team",
      action: "Open Team",
      keywords: ["team", "staff", "employee", "personnel", "worker", "invite"],
    },
    {
      question: "How do scanners work?",
      short: "Set up a scanner",
      answer:
        "Most USB and Bluetooth scanners work as keyboards. Open Scanner Setup, focus the test field and scan a known SKU, UPC, EAN, FNSKU or ASIN.",
      href: "/scanner",
      action: "Open scanner setup",
      keywords: ["scanner", "barcode", "upc", "scan"],
    },
    {
      question: "Where do I see problems?",
      short: "Review exceptions",
      answer:
        "The Control Tower prioritizes operational exceptions such as shortages, overages, damage and stalled inbound shipments using real warehouse data.",
      href: "/control-tower",
      action: "Open Control Tower",
      keywords: ["problem", "exception", "control tower", "shortage", "damage", "overage"],
    },
  ],
  es: [
    {
      question: "¿Cómo agrego un cliente?",
      short: "Agregar un cliente",
      answer:
        "Abrí Clientes y elegí Agregar cliente. Después de guardarlo podrás asignarle productos, recepciones y órdenes de trabajo.",
      href: "/customers/new",
      action: "Agregar cliente",
      keywords: ["cliente", "agregar cliente", "customer"],
    },
    {
      question: "¿Cómo importo productos?",
      short: "Importar productos",
      answer:
        "Guardá el archivo como CSV o TSV, abrí Productos → Importar archivo, elegí el cliente y asigná el campo correspondiente a cada columna.",
      href: "/products/import",
      action: "Importar productos",
      keywords: ["producto", "sku", "excel", "csv", "importar"],
    },
    {
      question: "¿Cómo recibo inventario?",
      short: "Recibir inventario",
      answer:
        "Primero creá una recepción esperada. Abrila para registrar cantidades y permitir que FulfillOS detecte faltantes, sobrantes, daños y demoras.",
      href: "/inbound/new",
      action: "Crear recepción",
      keywords: ["recibir", "recepcion", "inbound", "inventario", "envio"],
    },
    {
      question: "¿Cómo agrego personal?",
      short: "Invitar al equipo",
      answer:
        "Abrí Personal para invitar a cada empleado con una cuenta y rol individual. Su identidad pasa a formar parte de Proof of Work.",
      href: "/team",
      action: "Abrir Personal",
      keywords: ["personal", "equipo", "empleado", "trabajador", "invitar", "team"],
    },
    {
      question: "¿Cómo configuro un scanner?",
      short: "Configurar scanner",
      answer:
        "La mayoría de los scanners USB y Bluetooth funcionan como teclado. Abrí Configurar scanner, enfocá el campo de prueba y escaneá un SKU, UPC, EAN, FNSKU o ASIN.",
      href: "/scanner",
      action: "Configurar scanner",
      keywords: ["scanner", "escaner", "codigo", "barcode", "upc"],
    },
    {
      question: "¿Dónde veo los problemas?",
      short: "Revisar excepciones",
      answer:
        "La Torre de Control prioriza excepciones como faltantes, sobrantes, daños y recepciones demoradas utilizando datos reales de la operación.",
      href: "/control-tower",
      action: "Abrir Torre de Control",
      keywords: ["problema", "excepcion", "torre", "faltante", "dano", "sobrante"],
    },
  ],
};

const copy = {
  en: {
    eyebrow: "FulfillOS Assistant",
    title: "Hi — how can I help?",
    subtitle: "Ask about a workflow or choose a quick question.",
    greeting:
      "I can guide you through customers, products, receiving, scanners, personnel and the Control Tower. What would you like to do?",
    placeholder: "Ask a question…",
    send: "Send",
    fallback:
      "I couldn't find a reliable answer for that yet. You can send the question to FulfillOS Support with your workspace details.",
    contact: "Contact support",
    introTitle: "Need a hand?",
    introText:
      "Your FulfillOS Assistant is always here with workflow guidance and direct links.",
    show: "Show me",
    dismiss: "Dismiss",
    quick: "Popular questions",
    close: "Close help",
    open: "Open FulfillOS help",
  },
  es: {
    eyebrow: "Asistente FulfillOS",
    title: "Hola, ¿cómo te ayudo?",
    subtitle: "Preguntá sobre un flujo o elegí una consulta rápida.",
    greeting:
      "Puedo guiarte con clientes, productos, recepciones, scanners, personal y la Torre de Control. ¿Qué querés hacer?",
    placeholder: "Escribí una pregunta…",
    send: "Enviar",
    fallback:
      "Todavía no encontré una respuesta confiable para eso. Podés enviar la consulta a Soporte FulfillOS con los datos de tu workspace.",
    contact: "Contactar soporte",
    introTitle: "¿Necesitás ayuda?",
    introText:
      "Tu Asistente FulfillOS está siempre disponible con guías y accesos directos.",
    show: "Mostrarme",
    dismiss: "Cerrar",
    quick: "Preguntas frecuentes",
    close: "Cerrar ayuda",
    open: "Abrir ayuda de FulfillOS",
  },
} as const;

function localeFromCookie(): Locale {
  return document.cookie
    .split(";")
    .some((item) => item.trim() === "fulfillos_locale=es")
    ? "es"
    : "en";
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function GlobalHelp() {
  const pathname = usePathname();
  const floorMode = pathname.startsWith("/floor");
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [open, setOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const strings = copy[locale];
  const availableTopics = topics[locale];

  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
    "asielhernandezmartinez@gmail.com";
  const mailHref = useMemo(
    () =>
      `mailto:${supportEmail}?subject=${encodeURIComponent(
        "FulfillOS support request",
      )}&body=${encodeURIComponent(
        "Hello FulfillOS Support,\n\nWorkspace/company:\nArea (Inbound, Inventory, Products, Billing, Other):\nWhat were you trying to do?\nWhat happened?\n\nScreenshots or record numbers:\n",
      )}`,
    [supportEmail],
  );

  useEffect(() => {
    setLocale(localeFromCookie());
    if (!hasEnvVars) return;

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null;
      setAuthenticated(Boolean(id));
      setUserId(id);
      if (id && !localStorage.getItem(`fulfillos-help-intro-v2-${id}`)) {
        window.setTimeout(() => setShowIntro(true), 900);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function dismissIntro() {
    setShowIntro(false);
    if (userId) {
      localStorage.setItem(`fulfillos-help-intro-v2-${userId}`, "seen");
    }
  }

  function openAssistant() {
    dismissIntro();
    setOpen(true);
    setMessages((current) =>
      current.length
        ? current
        : [
            {
              id: nextId.current++,
              role: "assistant",
              text: strings.greeting,
            },
          ],
    );
  }

  function ask(question: string) {
    const normalized = normalize(question);
    if (!normalized) return;
    const match = availableTopics.find((topic) =>
      topic.keywords.some((keyword) =>
        normalized.includes(normalize(keyword)),
      ),
    );
    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text: question },
      {
        id: nextId.current++,
        role: "assistant",
        text: match?.answer ?? strings.fallback,
        topic: match,
      },
    ]);
    setInput("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  if (!authenticated) return null;

  return (
    <>
      {showIntro && !open && (
        <aside
          className={`${floorMode ? "bottom-44" : "bottom-24"} fixed right-4 z-[69] w-[calc(100vw-2rem)] max-w-xs rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl`}
          aria-label={strings.introTitle}
        >
          <button
            type="button"
            onClick={dismissIntro}
            aria-label={strings.dismiss}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#162033] text-[#fdba2d]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="pr-4">
              <p className="font-black text-[#162033]">{strings.introTitle}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {strings.introText}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAssistant}
            className="mt-4 w-full rounded-xl bg-[#f59e0b] px-4 py-2.5 text-sm font-black text-[#162033] hover:bg-[#fdba2d]"
          >
            {strings.show}
          </button>
          <span className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b border-r border-amber-200 bg-white" />
        </aside>
      )}

      {open && (
        <aside
          aria-label="FulfillOS help"
          className={`${floorMode ? "bottom-44 h-[min(620px,calc(100vh-13rem))]" : "bottom-24 h-[min(680px,calc(100vh-8rem))]"} fixed right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl`}
        >
          <header className="bg-[#162033] p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f59e0b] text-[#162033]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#fdba2d]">
                    {strings.eyebrow}
                  </p>
                  <h2 className="mt-1 text-lg font-black">{strings.title}</h2>
                  <p className="mt-1 text-xs text-slate-300">
                    {strings.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={strings.close}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-10 rounded-2xl rounded-br-md bg-[#162033] px-4 py-3 text-sm leading-6 text-white"
                      : "mr-6 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
                  }
                >
                  <p>{message.text}</p>
                  {message.topic && (
                    <Link
                      href={message.topic.href}
                      onClick={() => setOpen(false)}
                      className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-amber-50 px-3 font-bold text-[#c7511f]"
                    >
                      {message.topic.action} →
                    </Link>
                  )}
                  {!message.topic &&
                  message.role === "assistant" &&
                  messages.length > 1 ? (
                    <a
                      href={mailHref}
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-50 px-3 font-bold text-[#c7511f]"
                    >
                      <LifeBuoy className="h-4 w-4" />
                      {strings.contact}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            {messages.length <= 1 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  {strings.quick}
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTopics.slice(0, 5).map((topic) => (
                    <button
                      key={topic.short}
                      type="button"
                      onClick={() => ask(topic.question)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#162033] shadow-sm hover:border-amber-300 hover:bg-amber-50"
                    >
                      {topic.short}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="fulfillos-help-question">
                {strings.placeholder}
              </label>
              <textarea
                id="fulfillos-help-question"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    ask(input);
                  }
                }}
                rows={1}
                placeholder={strings.placeholder}
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label={strings.send}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f59e0b] text-[#162033] disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </aside>
      )}

      <button
        type="button"
        onClick={open ? () => setOpen(false) : openAssistant}
        aria-label={strings.open}
        aria-expanded={open}
        className={`${floorMode ? "bottom-24" : "bottom-5"} group fixed right-5 z-[70] flex h-16 w-16 items-center justify-center rounded-2xl bg-[#162033] text-[#fdba2d] shadow-[0_14px_35px_rgba(15,23,42,0.35)] ring-4 ring-white/80 transition hover:-translate-y-1 hover:bg-[#243247]`}
      >
        {open ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
        {!open && (
          <span className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-[#162033] bg-emerald-400" />
        )}
        {!open && showIntro && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-[#f59e0b]/40" />
        )}
      </button>
    </>
  );
}
