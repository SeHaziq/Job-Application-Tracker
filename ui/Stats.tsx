export function Stats({ items }: { items: [string, number][] }) {
  return <dl className="stats">
    {items.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}
  </dl>;
}
