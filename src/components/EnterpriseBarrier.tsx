export function EnterpriseBarrier({
  onAuthenticate,
  onClose,
}: {
  onAuthenticate: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#08080A] border border-white/10 p-8 relative shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-6 right-6 text-zinc-500 hover:text-white font-mono text-xs uppercase cursor-pointer"
          onClick={onClose}
        >
          Close
        </button>
        <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] mb-2">
          // ENTERPRISE VERIFICATION
        </p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0 mb-4">
          Enterprise verification required.
        </h2>
        <p className="font-mono text-xs text-zinc-400 leading-relaxed mb-6">
          Authenticate brand credentials to unlock raw footage reels and direct talent contracts.
        </p>
        <button
          type="button"
          className="w-full bg-white text-black font-mono text-xs uppercase tracking-widest py-3 border-0 cursor-pointer"
          onClick={onAuthenticate}
        >
          Authenticate to Unmask Roster →
        </button>
      </div>
    </div>
  );
}
