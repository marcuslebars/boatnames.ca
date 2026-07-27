import { useEffect, useRef, useState } from "react";
import { estimateRunLengthIn } from "./previewer-measure";
import { ALL_FINISHES, FONT_OPTIONS, type PreviewConfig } from "./previewer-types";
import { previewShareUrl } from "./previewer-url";
import { CONSENT_TEXT, HONEYPOT_FIELD, quoteSchema, TIMING_FIELD } from "./quote-schema";

type Props = {
  prefill: PreviewConfig;
};

type Status = "idle" | "sending" | "ok" | "error";

// Post to our own server route (never straight to an external intake) so the
// HMAC secret and forwarding stay server-side. A missing/broken endpoint fails
// loudly here — there is no fake-success fallback.
const ENDPOINT = "/api/quote";

export function QuoteForm({ prefill }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [shareUrl, setShareUrl] = useState("");
  const startedAt = useRef<number>(0);

  // Start the anti-bot fill timer once the form is interactive.
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Best-effort UTM capture from the landing URL, before the previewer's URL
  // sync overwrites the query string.
  const utm = useRef<Record<string, string>>({});
  useEffect(() => {
    const collected: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((val, key) => {
      if (key.startsWith("utm_")) collected[key] = val;
    });
    utm.current = collected;
  }, []);

  // Shareable preview URL needs window.origin, so compute it on the client.
  useEffect(() => {
    setShareUrl(previewShareUrl(prefill, window.location.origin));
  }, [prefill]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrMsg("");
    setFieldErrors({});
    const form = e.currentTarget;
    const fd = new FormData(form);

    // Client-side validation mirrors the server schema (the server re-validates).
    const record: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      if (!(v instanceof File)) record[k] = v;
    });
    const parsed = quoteSchema.safeParse(record);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fe[key]) fe[key] = issue.message;
      }
      setFieldErrors(fe);
      setStatus("error");
      setErrMsg("Please fix the highlighted fields and try again.");
      return;
    }

    // Metadata recorded with the lead (multipart carries the photo file itself).
    fd.set(TIMING_FIELD, String(startedAt.current));
    fd.set("preview_url", shareUrl);
    fd.set("consent_text", CONSENT_TEXT);
    fd.set("source", "boatnames.ca");
    for (const [key, val] of Object.entries(utm.current)) fd.set(key, val);

    // Per-font measured run length for the quote + CRM envelope.
    const fontKey = String(fd.get("font") ?? prefill.font);
    const fontOpt = FONT_OPTIONS.find((f) => f.key === fontKey) ?? FONT_OPTIONS[0];
    const wantedName = String(fd.get("boat_name") ?? "").trim() || "YOUR BOAT";
    const heightIn = Number(fd.get("letter_height") ?? prefill.size);
    const upper = fontOpt.key !== "yacht-script";
    fd.set(
      "run_length",
      String(
        estimateRunLengthIn(
          upper ? wantedName.toUpperCase() : wantedName,
          fontOpt.css,
          fontOpt.weight ?? 400,
          heightIn,
        ),
      ),
    );

    try {
      const res = await fetch(ENDPOINT, { method: "POST", body: fd });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) detail = body.error;
        } catch {
          // non-JSON error body; keep the status code
        }
        console.error("Quote submission failed:", detail);
        throw new Error(detail);
      }
      setStatus("ok");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrMsg(
        "We couldn't send that just now. Please try again, or email hello@a1marinecare.ca.",
      );
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-sm border border-[color:var(--polish)]/50 bg-[color:var(--polish)]/5 p-8">
        <p className="font-mono text-[10px] tracking-widest text-[color:var(--polish)]">RECEIVED</p>
        <h3 className="mt-3 font-sans text-3xl font-bold uppercase tracking-tight text-[color:var(--gelcoat)]">
          We'll send a proof and a price within one business day.
        </h3>
        <p className="mt-3 max-w-xl text-[color:var(--wake)]">
          If we need a clearer transom photo or a measurement we'll email first before quoting. No
          auto-replies, no drip sequence.
        </p>
        {shareUrl && (
          <a
            href={shareUrl}
            className="mt-6 inline-block font-mono text-[10px] tracking-widest text-[color:var(--polish)] underline underline-offset-4"
          >
            REOPEN YOUR DESIGN →
          </a>
        )}
        <div>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setFieldErrors({});
              setErrMsg("");
            }}
            className="mt-4 font-mono text-[10px] tracking-widest text-[color:var(--wake)] underline underline-offset-4 hover:text-[color:var(--gelcoat)]"
          >
            SUBMIT ANOTHER →
          </button>
        </div>
      </div>
    );
  }

  // Key on the design signature so the uncontrolled design fields re-seed from
  // the CURRENT previewer config (defaultValue only applies on mount, and the
  // URL hydration updates the config after the first render).
  const designKey = `${prefill.name}|${prefill.port}|${prefill.font}|${prefill.finish}|${prefill.size}`;

  return (
    <form
      key={designKey}
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 gap-5 sm:grid-cols-2"
    >
      <Input name="name" label="Your name" required error={fieldErrors.name} />
      <Input name="email" label="Email" type="email" required error={fieldErrors.email} />
      <Input name="phone" label="Phone" type="tel" error={fieldErrors.phone} />
      <Input
        name="boat_model"
        label="Boat make and model"
        placeholder="e.g. Meridian 408"
        error={fieldErrors.boat_model}
      />
      <Input name="marina" label="Marina or town" error={fieldErrors.marina} />
      <Input
        name="transom_width"
        label="Transom width (inches)"
        type="number"
        min={12}
        error={fieldErrors.transom_width}
      />
      <Input
        name="boat_name"
        label="Boat name wanted"
        defaultValue={prefill.name}
        maxLength={18}
        error={fieldErrors.boat_name}
      />
      <Input
        name="hailing_port"
        label="Hailing port (optional)"
        defaultValue={prefill.port}
        error={fieldErrors.hailing_port}
      />

      <Select name="font" label="Font" defaultValue={prefill.font} error={fieldErrors.font}>
        {FONT_OPTIONS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </Select>
      <Select name="finish" label="Finish" defaultValue={prefill.finish} error={fieldErrors.finish}>
        {ALL_FINISHES.map((f) => (
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
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="block w-full font-mono text-xs text-[color:var(--wake)] file:mr-4 file:rounded-sm file:border file:border-[color:var(--wake)]/30 file:bg-transparent file:px-3 file:py-2 file:text-[10px] file:tracking-widest file:text-[color:var(--gelcoat)] hover:file:border-[color:var(--polish)]"
        />
        <p className="mt-2 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
          A clean square-on photo lets us template without visiting the boat. JPG, PNG, WEBP or
          HEIC, up to 10 MB.
        </p>
      </div>

      {/* Honeypot: hidden from people, tempting to bots. Must stay empty. */}
      <div aria-hidden className="hidden">
        <label>
          Company
          <input name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-start gap-3">
          <input
            name="consent"
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[color:var(--polish)]"
            aria-invalid={!!fieldErrors.consent}
          />
          <span className="text-xs leading-relaxed text-[color:var(--wake)]">{CONSENT_TEXT}</span>
        </label>
        {fieldErrors.consent && (
          <span className="mt-1 block font-mono text-[10px] text-red-400">
            {fieldErrors.consent}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs text-[color:var(--wake)]">
          We reply within one business day with a proof and a price. No newsletters.
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-6 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90 disabled:opacity-60"
        >
          {status === "sending" ? "SENDING…" : "REQUEST A QUOTE →"}
        </button>
      </div>
      {status === "error" && errMsg && (
        <p
          className="font-mono text-[10px] tracking-widest text-red-400 sm:col-span-2"
          role="alert"
        >
          {errMsg}
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block font-mono text-[10px] text-red-400">
      {message}
    </span>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string },
) {
  const { label, error, name, ...rest } = props;
  const errId = error ? `${name}-error` : undefined;
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        name={name}
        aria-invalid={!!error}
        aria-describedby={errId}
        className={`${inputCls} ${error ? "border-red-400/70" : ""}`}
        {...rest}
      />
      <FieldError id={errId ?? ""} message={error} />
    </label>
  );
}

function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string },
) {
  const { label, error, name, children, ...rest } = props;
  const errId = error ? `${name}-error` : undefined;
  return (
    <label className="block">
      <Label>{label}</Label>
      <select
        name={name}
        aria-invalid={!!error}
        aria-describedby={errId}
        className={`${inputCls} ${error ? "border-red-400/70" : ""}`}
        {...rest}
      >
        {children}
      </select>
      <FieldError id={errId ?? ""} message={error} />
    </label>
  );
}
