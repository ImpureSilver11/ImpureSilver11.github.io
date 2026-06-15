import { getAllPosts, getPost } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)

  return (
    <article>
      <Link href="/blog" className="text-sm text-gray-400 hover:text-gray-600 mb-6 block">
        ← Blog一覧
      </Link>
      <p className="text-sm text-gray-400 mb-2">{post.date}</p>
      <h1 className="text-2xl font-bold mb-8">{post.title}</h1>
      <div className="prose prose-gray max-w-none">
        <MDXRemote source={post.content} />
      </div>
    </article>
  )
}
