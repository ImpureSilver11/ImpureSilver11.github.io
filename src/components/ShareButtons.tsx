'use client'

import { useState } from 'react'

function getShareUrl() {
  if (typeof window === 'undefined') return ''
  return window.location.href
}

export default function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  const openTwitter = () => {
    const url = getShareUrl()
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  const openBluesky = () => {
    const url = getShareUrl()
    const text = `${title}\n${url}`
    const intent = `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  const copyLink = async () => {
    const text = `${title}\n${getShareUrl()}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const btnStyle = {
    color: '#4ade80',
    borderColor: '#4ade80',
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mt-12 pt-6 border-t" style={{ borderColor: '#166534' }}>
      <span className="text-sm" style={{ color: '#86efac' }}>この記事をシェア:</span>
      <button
        onClick={openTwitter}
        className="text-sm px-3 py-1 rounded border transition-opacity hover:opacity-70"
        style={btnStyle}
      >
        Twitter
      </button>
      <button
        onClick={openBluesky}
        className="text-sm px-3 py-1 rounded border transition-opacity hover:opacity-70"
        style={btnStyle}
      >
        Bluesky
      </button>
      <button
        onClick={copyLink}
        className="text-sm px-3 py-1 rounded border transition-opacity hover:opacity-70"
        style={btnStyle}
      >
        {copied ? 'コピーしました' : 'リンクをコピー'}
      </button>
    </div>
  )
}
