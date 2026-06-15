import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900 hover:text-gray-600">
          ImpureSilver11
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Portfolio
          </Link>
          <Link href="/blog" className="text-gray-600 hover:text-gray-900">
            Blog
          </Link>
        </nav>
      </div>
    </header>
  )
}
