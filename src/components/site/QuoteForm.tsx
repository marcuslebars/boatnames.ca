import { useState } from "react";
import { FINISH_OPTIONS, FONT_OPTIONS, type PreviewConfig } from "./previewer-types";

type Props = {
  prefill: PreviewConfig;
};

type Status = "idle" | "sending" | "ok" | "error";

export function QuoteForm({ prefill }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrMsg("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      if (v instanceof File) {
        if (v.size > 0) payload[k] = { name: v.name, size: v.size, type: v.type };
      } else {
        payload[k] = v;
      }
    });
    const endpoint = (import.meta.env.VITE_LEAD_ENDPOINT as string | undefined) ?? "";
    try {
      if (!endpoint) {
        // No endpoint configured: simulate success locally so the UI still works.
        await new Promise((r) => setTimeout(r, 600));
      } else {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, source: "holyship.a1marinecare.ca" }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
      }
      setStatus("ok");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-sm border border-[color:var(--polish)]/50 bg-[color:var(--polish)]/5 p-8">
        <p className="font-mono text-[10px] tracking-widest text-[color:var(--polish)]">RECEIVED</p>
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight text-[color:var(--gelcoat)]">
          We'll send a proof and a price within one business day.
        </h3>
        <p className="mt-3 max-w-xl text-[color:var(--wake)]">
          If we need a clearer transom photo or a measurement we'll email first before quoting. No
          auto-replies, no drip sequence.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 font-mono text-[10px] tracking-widest text-[color:var(--polish)] underline underline-offset-4"
        >
          SUBMIT ANOTHER →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Input name="name" label="Your name" required />
      <Input name="email" label="Email" type="email" required />
      <Input name="phone" label="Phone" type="tel" />
      <Input name="boat_model" label="Boat make and model" placeholder="e.g. Meridian 408" />
      <Input name="marina" label="Marina or town" />
      <Input name="transom_width" label="Transom width (inches)" type="number" min={12} />
      <Input name="boat_name" label="Boat name wanted" defaultValue={prefill.name} maxLength={18} />
      <Input name="hailing_port" label="Hailing port (optional)" defaultValue={prefill.port} />

      <Select name="font" label="Font" defaultValue={prefill.font}>
        {FONT_OPTIONS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </Select>
      <Select name="finish" label="Finish" defaultValue={prefill.finish}>
        {FINISH_OPTIONS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </Select>

      <div className="sm:col-span-2">
        <Label>Letter height</Label>
        <input
          name="letter_height"
          defaultValue={prefill.size}
          type="number"
          step="0.5"
          min={3}
          max={14}
          className={inputCls}
        />
      </div>

      <div className="sm:col-span-2">
        <Label>Notes</Label>
        <textarea
          name="notes"
          rows={4}
          className={inputCls}
          placeholder="Anything about the layout, timing, or the boat."
        />
      </div>

      <div className="sm:col-span-2">
        <Label>Transom photo (optional)</Label>
        <input
          name="photo"
          type="file"
          accept="image/*"
          className="block w-full font-mono text-xs text-[color:var(--wake)] file:mr-4 file:rounded-sm file:border file:border-[color:var(--wake)]/30 file:bg-transparent file:px-3 file:py-2 file:text-[10px] file:tracking-widest file:text-[color:var(--gelcoat)] hover:file:border-[color:var(--polish)]"
        />
        <p className="mt-2 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
          A clean square-on photo lets us template without visiting the boat.
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs text-[color:var(--wake)]">
          We reply within one business day with a proof and a price. No newsletters.
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-6 py-3 font-mono text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90 disabled:opacity-60"
        >
          {status === "sending" ? "SENDING…" : "REQUEST A QUOTE →"}
        </button>
      </div>
      {status === "error" && (
        <p className="sm:col-span-2 font-mono text-[10px] tracking-widest text-red-400">
          COULDN'T SEND — {errMsg.toUpperCase()}
        </p>
      )}
    </form>
  );
}

const inputCls =
  "w-full rounded-sm border border-[color:var(--wake)]/25 bg-[color:var(--hull)] px-3 py-2 text-[color:var(--gelcoat)] outline-none transition focus:border-[color:var(--polish)]";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
      {typeof children === "string" ? children.toUpperCase() : children}
    </span>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <Label>{label}</Label>
      <input {...rest} className={inputCls} />
    </label>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const { label, children, ...rest } = props;
  return (
    <label className="block">
      <Label>{label}</Label>
      <select {...rest} className={inputCls}>
        {children}
      </select>
    </label>
  );
}
