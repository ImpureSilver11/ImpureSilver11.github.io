import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'

export default function BlogList() {
  const posts = getAllPosts()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-gray-500">記事はまだありません。</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug} className="border-b border-gray-200 pb-6">
              <Link href={`/blog/${post.slug}`} className="group">
                <p className="text-sm text-gray-400 mb-1">{post.date}</p>
                <h2 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
                {post.description && (
                  <p className="text-gray-600 text-sm mt-1">{post.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
