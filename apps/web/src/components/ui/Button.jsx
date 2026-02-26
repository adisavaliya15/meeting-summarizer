const VARIANT_CLASS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
  destructive: "btn-destructive",
};

export default function Button({ type = "button", variant = "primary", className = "", ...props }) {
  return <button type={type} className={`${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} ${className}`.trim()} {...props} />;
}
