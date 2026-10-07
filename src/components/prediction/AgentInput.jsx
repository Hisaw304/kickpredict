import { ArrowUp } from "lucide-react";

export default function AgentInput({ value, onChange, onSubmit, loading }) {
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="kp-agent-input-wrapper">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask KickPredict anything..."
        rows={2}
        disabled={loading}
        aria-label="Prediction request"
      />

      <button
        type="button"
        onClick={() => onSubmit()}
        disabled={!value.trim() || loading}
        aria-label="Send prediction request"
      >
        {loading ? (
          <span className="kp-input-loader" />
        ) : (
          <ArrowUp size={20} strokeWidth={2.2} />
        )}
      </button>
    </div>
  );
}
