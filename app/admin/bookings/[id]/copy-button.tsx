"use client";
export default function CopyButton({text}:{text:string}) {
  return <button type="button" className="btn secondary" onClick={() => navigator.clipboard.writeText(text)}>
    نسخ رسالة الزبون
  </button>;
}
