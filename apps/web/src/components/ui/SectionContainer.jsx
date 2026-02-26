export default function SectionContainer({ className = "", children }) {
  return <div className={`section-container ${className}`.trim()}>{children}</div>;
}
