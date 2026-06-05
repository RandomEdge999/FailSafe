import { CircleDashed } from "lucide-react";

type EmptyStateProps = {
  title: string;
  body: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <CircleDashed className="mb-3 h-8 w-8 text-signal" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
