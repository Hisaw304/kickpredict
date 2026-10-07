const prompts = [
  "Give me 5 safe picks tonight",
  "Give me 5 picks over 1.5",
  "Give me 5 double chance picks",
  "Give me 10 picks this weekend",
];

export default function QuickPrompts({ onSelect, disabled }) {
  return (
    <div className="kp-quick-prompts">
      <span>Try asking</span>

      <div className="kp-quick-prompt-list">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            disabled={disabled}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
