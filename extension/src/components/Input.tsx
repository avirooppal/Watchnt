import { useId, type InputHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: IconName;
}
export function Input({
  label,
  error,
  hint,
  icon,
  className = "",
  id: provided,
  ...props
}: InputProps) {
  const generated = useId(),
    id = provided || generated,
    description = error || hint;
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <div className={`input-wrap ${icon ? "with-icon" : ""}`}>
        {icon && <Icon name={icon} size={18} />}
        <input
          {...props}
          id={id}
          className={`input ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [
              props["aria-describedby"],
              description ? `${id}-description` : undefined,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
      </div>
      {description && (
        <span
          id={`${id}-description`}
          className={error ? "field-error" : "field-hint"}
        >
          {description}
        </span>
      )}
    </div>
  );
}
