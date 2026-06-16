import { getAllPosts, getPost } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import rehypePrettyCode from 'rehype-pretty-code'
import Callout from '@/components/mdx/Callout'
import YouTube from '@/components/mdx/YouTube'
import LinkCard from '@/components/mdx/LinkCard'

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)

  return (
    <article>
      <Link href="/blog" className="text-sm mb-6 block" style={{ color: '#4ade80' }}>
        ← Blog一覧
      </Link>
      <p className="text-sm mb-2" style={{ color: '#86efac' }}>{post.date}</p>
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#bbf7d0' }}>{post.title}</h1>
      <div
        className="prose max-w-none"
        style={{
          color: '#dcfce7',
          ['--tw-prose-body' as string]: '#dcfce7',
          ['--tw-prose-headings' as string]: '#bbf7d0',
          ['--tw-prose-links' as string]: '#4ade80',
          ['--tw-prose-bold' as string]: '#bbf7d0',
          ['--tw-prose-code' as string]: '#86efac',
          ['--tw-prose-quotes' as string]: '#86efac',
        }}
      >
        <MDXRemote
          source={post.content}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkBreaks, remarkGfm],
              rehypePlugins: [[rehypePrettyCode, { theme: 'github-dark' }]],
            },
          }}
          components={{
            small: (props) => <small {...props} className="opacity-60" style={{ fontSize: '8pt' }} />,
            Callout,
            YouTube,
            LinkCard,
          }}
        />
      </div>
    </article>
  )
}
