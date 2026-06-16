export default function LinkCard({
  url,
  title,
  description,
}: {
  url: string
  title: string
  description?: string
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block pixel-panel my-4 hover:bg-green-950"
      style={{ textDecoration: 'none' }}
    >
      <div className="text-green-300" style={{ fontSize: '11px', fontWeight: 'bold' }}>{title}</div>
      {description && (
        <div className="text-green-600 mt-1" style={{ fontSize: '10px' }}>{description}</div>
      )}
      <div className="text-green-700 mt-1" style={{ fontSize: '9px' }}>{url}</div>
    </a>
  )
}
