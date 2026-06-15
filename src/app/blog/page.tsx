import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'

export default function BlogList() {
  const posts = getAllPosts()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#bbf7d0' }}>Blog</h1>
      {posts.length === 0 ? (
        <p style={{ color: '#86efac' }}>記事はまだありません。</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug} className="pb-6" style={{ borderBottom: '1px dashed #166534' }}>
              <Link href={`/blog/${post.slug}`} className="group">
                <p className="text-sm mb-1" style={{ color: '#86efac' }}>{post.date}</p>
                <h2 className="text-lg font-semibold" style={{ color: '#dcfce7' }}>
                  {post.title}
                </h2>
                {post.description && (
                  <p className="text-sm mt-1" style={{ color: '#86efac' }}>{post.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
