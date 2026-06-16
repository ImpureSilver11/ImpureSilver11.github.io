'use client'

import { useEffect, useState } from 'react'
import { BskyAgent } from '@atproto/api'

type Post = {
  rkey: string
  text: string
  createdAt: string
  likeCount: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })
}

function postUrl(rkey: string) {
  return `https://bsky.app/profile/impuresilver11.com/post/${rkey}`
}

export default function BlueskyFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const agent = new BskyAgent({ service: 'https://public.api.bsky.app' })
    agent
      .getAuthorFeed({ actor: 'impuresilver11.com', limit: 10 })
      .then((res) => {
        const items: Post[] = res.data.feed
          .filter((item) => !item.reply)
          .slice(0, 5)
          .map((item) => ({
            rkey: item.post.uri.split('/').pop() ?? '',
            text: (item.post.record as { text: string }).text,
            createdAt: (item.post.record as { createdAt: string }).createdAt,
            likeCount: item.post.likeCount ?? 0,
          }))
        setPosts(items)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="fixed bottom-4 right-4"
      style={{ zIndex: 100, width: '260px' }}
    >
    <div
      className="pixel-panel"
      style={{ fontFamily: "'Press Start 2P', monospace", maxHeight: '340px', display: 'flex', flexDirection: 'column' }}
    >
      <div className="section-title text-center" style={{ fontSize: '9px' }}>
        ▶ BSKY FEED
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div className="text-green-600 text-center" style={{ fontSize: '7px' }}>
            LOADING<span className="blink">_</span>
          </div>
        )}
        {error && (
          <div className="text-red-500 text-center" style={{ fontSize: '7px' }}>
            FETCH ERROR
          </div>
        )}
        {posts.map((post) => (
          <a
            key={post.rkey}
            href={postUrl(post.rkey)}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-b pb-2 mb-2 hover:bg-green-950"
            style={{ borderColor: 'var(--border)', textDecoration: 'none' }}
          >
            <div className="text-green-300" style={{ fontSize: '7px', lineHeight: 1.8 }}>
              {post.text.length > 80 ? post.text.slice(0, 80) + '…' : post.text}
            </div>
            <div className="text-green-700 mt-1" style={{ fontSize: '6px' }}>
              {formatDate(post.createdAt)}　♥ {post.likeCount}
            </div>
          </a>
        ))}
      </div>
    </div>
    </div>
  )
}
