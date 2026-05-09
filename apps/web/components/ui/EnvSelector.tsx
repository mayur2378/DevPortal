const ENVS = ["dev", "test", "stage", "prod"] as const;
export type Env = typeof ENVS[number];

interface Props {
  value: Env;
  onChange: (env: Env) => void;
}

export function EnvSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {ENVS.map((env) => (
        <button
          key={env}
          type="button"
          onClick={() => onChange(env)}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            value === env
              ? "bg-sky-600 text-white"
              : "bg-slate-700 text-slate-400 hover:bg-slate-600"
          }`}
        >
          {env.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
