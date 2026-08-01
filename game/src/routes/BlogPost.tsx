// src/routes/BlogPost.tsx — a single dev-log post (/blog/:slug)
//
// Reading page, so the usual site rules bend in two places:
//   · Body prose is sentence-case, not all-caps. See the tone note at the
//     top of routes/About.tsx — same reasoning.
//   · The title, dek, tags, body and takeaway all live in one SHELL-wide
//     column CENTERED in the viewport, instead of hugging the left edge
//     like the rest of the site. Full-bleed left alignment is right for a
//     poster; it is wrong for 1,200 words, where it strands the reader in
//     the left third of a wide monitor. The top status strip and the
//     prev/next footer stay full-bleed so the page still reads as part of
//     the brutalist site.
//
// Unknown slugs render an in-fiction 404 rather than redirecting, so a
// stale link tells you what happened instead of silently dumping you on
// the index.

import { Link, useParams } from 'react-router-dom'
import {
  PageScroll, BR, brFont, brMono,
  Nav, Signup, Closer, Footer, useIsMobile,
  type NavLink,
} from '../brutalist'
import { POSTS, postBySlug, type Block, type Post } from '../content/posts'

const NAV_LINKS: NavLink[] = [
  { label: 'GAMES',   href: '/#games' },
  { label: 'DEV LOG', to: '/blog', active: true },
  { label: 'ABOUT',   to: '/about' },
  { label: 'CONTACT', href: 'mailto:hello@dumbcorporategames.com' },
]

// The reading measure — same value as routes/About.tsx. ~72 characters at
// the body size below.
const SHELL = 720
const shell: React.CSSProperties = { maxWidth: SHELL, margin: '0 auto' }

export default function BlogPost() {
  const { slug } = useParams()
  const post = postBySlug(slug)

  return (
    <PageScroll>
      <Nav links={NAV_LINKS} badge={post ? <>● {post.key}</> : <>● NOT FOUND</>} />
      {post ? <Article post={post} /> : <NotFound />}
      <Closer />
      <Signup />
      <Footer />
    </PageScroll>
  )
}

// ─── Article ─────────────────────────────────────────────────────────────
function Article({ post }: { post: Post }) {
  const isMobile = useIsMobile()
  const idx = POSTS.findIndex((p) => p.slug === post.slug)
  const prev = idx > 0 ? POSTS[idx - 1] : undefined
  const next = idx < POSTS.length - 1 ? POSTS[idx + 1] : undefined

  return (
    <>
      {/* Header */}
      <header style={{ borderBottom: `4px solid ${BR.ink}` }}>
        <div style={{
          padding: '16px 28px',
          borderBottom: `1px solid ${BR.ink}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
          flexWrap: 'wrap',
          fontFamily: brMono, fontSize: 11,
          textTransform: 'uppercase', letterSpacing: '0.14em', color: BR.muted,
        }}>
          <span><b style={{ color: BR.ink }}>{post.key}</b> · DEV LOG</span>
          <span>FILED <b style={{ color: BR.ink }}>{post.date}</b></span>
          <span><b style={{ color: BR.ink }}>{post.readMin} MIN READ</b></span>
        </div>

        <div style={{ padding: isMobile ? '20px 20px 26px' : '28px 32px 34px' }}>
          <div style={shell}>
            <div style={{
              fontFamily: brMono, fontSize: 11, color: BR.muted,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <Link to="/blog" style={{ color: BR.muted, textDecoration: 'none' }}>
                ← DEV LOG
              </Link>
              <span>·</span>
              <span>{post.key}</span>
            </div>
            {/* Sized to fit SHELL, not the viewport — a vw-keyed clamp would
                overflow this column on a wide monitor. */}
            <h1 style={{
              margin: 0, fontFamily: brFont, fontWeight: 900,
              fontSize: 'clamp(32px, 5.4vw, 58px)',
              lineHeight: 0.96, letterSpacing: '-0.04em',
              textTransform: 'uppercase',
              overflowWrap: 'anywhere', hyphens: 'auto',
            }}>
              {post.title}<span style={{ color: BR.accent }}>.</span>
            </h1>
            <p style={{
              margin: '20px 0 0', fontFamily: brFont,
              fontSize: 'clamp(17px, 1.8vw, 21px)', lineHeight: 1.45,
              fontWeight: 500, color: BR.muted,
            }}>
              {post.dek}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 18 }}>
              {post.tags.map((t) => (
                <span key={t} style={{
                  fontFamily: brMono, fontSize: 10, fontWeight: 700,
                  padding: '4px 8px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  border: `1px solid ${BR.ink}`, color: BR.ink,
                }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <article style={{
        borderBottom: `4px solid ${BR.ink}`,
        padding: isMobile ? '28px 20px 34px' : '40px 32px 48px',
        background: BR.bg,
      }}>
        <div style={shell}>
          {/* WHY THIS MATTERS — deliberately BEFORE the story. A reader who
              stops here should still have gotten the point of the post. */}
          <div style={{
            marginBottom: 38,
            border: `2px solid ${BR.ink}`, background: BR.paper,
            padding: isMobile ? '18px' : '22px 26px',
          }}>
            <div style={{
              fontFamily: brMono, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              color: BR.accent, marginBottom: 10,
            }}>
              WHY THIS MATTERS
            </div>
            <div style={{
              fontFamily: brFont, fontSize: 'clamp(16px, 1.3vw, 18px)',
              lineHeight: 1.6, color: '#222',
            }}>{em(post.soWhat)}</div>
          </div>

          {post.body.map((b, i) => <BlockView key={i} b={b} />)}

          {/* Takeaway — the one focal orange element of the article body. */}
          <div style={{
            marginTop: 40,
            borderTop: `4px solid ${BR.accent}`,
            background: BR.paper,
            padding: isMobile ? '20px' : '24px 28px',
          }}>
            <div style={{
              fontFamily: brMono, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              color: BR.muted, marginBottom: 10,
            }}>
              IF YOU REMEMBER ONE THING
            </div>
            <div style={{
              fontFamily: brFont, fontWeight: 700,
              fontSize: 'clamp(19px, 2.2vw, 26px)', lineHeight: 1.3,
              letterSpacing: '-0.015em', color: BR.ink,
            }}>
              {post.takeaway}
            </div>
          </div>

          {/* TRY THIS — the whole reason someone with no background is
              reading. Concrete steps, numbered, no "be careful" filler. */}
          <div style={{
            marginTop: 28,
            background: BR.ink, color: BR.bg,
            padding: isMobile ? '20px' : '26px 28px',
          }}>
            <div style={{
              fontFamily: brMono, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              color: BR.accent, marginBottom: 6,
            }}>
              TRY THIS ON YOUR OWN FIRST GAME
            </div>
            <div style={{
              fontFamily: brMono, fontSize: 11, color: '#888',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18,
            }}>
              {post.apply.length} THINGS · NO EXPERIENCE REQUIRED
            </div>
            {post.apply.map((a, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)',
                gap: 8, padding: '11px 0',
                borderTop: i ? '1px dashed #444' : 'none',
                fontFamily: brFont, fontSize: 'clamp(15px, 1.2vw, 17px)',
                lineHeight: 1.55, color: '#ddd',
              }}>
                <span style={{
                  fontFamily: brMono, fontSize: 11, fontWeight: 700,
                  color: BR.accent, paddingTop: 4,
                }}>{String(i + 1).padStart(2, '0')}</span>
                <span>{em(a)}</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Prev / next */}
      <nav style={{
        borderBottom: `4px solid ${BR.ink}`,
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      }}>
        <AdjacentLink post={prev} dir="PREVIOUS" />
        <AdjacentLink post={next} dir="NEXT" bordered={!isMobile} />
      </nav>
    </>
  )
}

function AdjacentLink({
  post, dir, bordered = false,
}: { post?: Post; dir: 'PREVIOUS' | 'NEXT'; bordered?: boolean }) {
  const isMobile = useIsMobile()
  const pad = isMobile ? '20px' : '26px 32px'
  const label = (
    <span style={{
      fontFamily: brMono, fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.16em', color: BR.muted,
    }}>{dir === 'PREVIOUS' ? '← ' : ''}{dir} POST{dir === 'NEXT' ? ' →' : ''}</span>
  )

  // No adjacent post: a plain, genuinely dead row — not a link that goes
  // nowhere (design rule 4).
  if (!post) {
    return (
      <div style={{
        padding: pad, background: BR.paper,
        borderLeft: bordered ? `1px solid ${BR.ink}` : 'none',
        borderTop: isMobile ? `1px solid ${BR.ink}` : 'none',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {label}
        <span style={{
          fontFamily: brFont, fontWeight: 900, fontSize: 20,
          textTransform: 'uppercase', letterSpacing: '-0.02em', color: BR.dim,
        }}>
          {dir === 'NEXT' ? 'NOT WRITTEN YET' : 'THIS IS THE FIRST ONE'}
        </span>
      </div>
    )
  }

  return (
    <Link to={`/blog/${post.slug}`} style={{
      padding: pad, background: BR.bg, textDecoration: 'none', color: BR.ink,
      borderLeft: bordered ? `1px solid ${BR.ink}` : 'none',
      borderTop: isMobile ? `1px solid ${BR.ink}` : 'none',
      display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
    }}>
      {label}
      <span style={{
        fontFamily: brFont, fontWeight: 900,
        fontSize: 'clamp(19px, 2.4vw, 28px)', lineHeight: 1.02,
        textTransform: 'uppercase', letterSpacing: '-0.03em',
        overflowWrap: 'anywhere', hyphens: 'auto',
      }}>{post.title}</span>
    </Link>
  )
}

// ─── Block renderer ──────────────────────────────────────────────────────
function BlockView({ b }: { b: Block }) {
  const isMobile = useIsMobile()

  switch (b.k) {
    case 'lead':
      return (
        <p style={{
          margin: '0 0 24px', fontFamily: brFont, fontWeight: 500,
          fontSize: 'clamp(19px, 1.7vw, 23px)', lineHeight: 1.5, color: BR.ink,
        }}>{em(b.t)}</p>
      )

    case 'p':
      return (
        <p style={{
          margin: '0 0 20px', fontFamily: brFont,
          fontSize: 'clamp(17px, 1.3vw, 19px)', lineHeight: 1.62, color: '#222',
        }}>{em(b.t)}</p>
      )

    case 'h':
      return (
        <h2 style={{
          margin: '40px 0 18px', fontFamily: brFont, fontWeight: 900,
          fontSize: 'clamp(22px, 2.8vw, 32px)', lineHeight: 1.05,
          letterSpacing: '-0.03em', textTransform: 'uppercase',
          borderTop: `2px solid ${BR.ink}`, paddingTop: 18,
        }}>{b.t}</h2>
      )

    case 'quote':
      return (
        <div style={{
          margin: '32px 0', paddingLeft: 20,
          borderLeft: `4px solid ${BR.accent}`,
          fontFamily: brFont, fontWeight: 700,
          fontSize: 'clamp(20px, 2.3vw, 28px)', lineHeight: 1.26,
          letterSpacing: '-0.015em', color: BR.ink,
        }}>{em(b.t)}</div>
      )

    case 'ul':
      return (
        <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none' }}>
          {b.items.map((it, i) => (
            <li key={i} style={{
              display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr)',
              gap: 6, padding: '9px 0',
              borderTop: i ? `1px dashed ${BR.dim}` : `1px dashed ${BR.dim}`,
              fontFamily: brFont, fontSize: 'clamp(16px, 1.25vw, 18px)',
              lineHeight: 1.55, color: '#222',
            }}>
              <span style={{
                color: BR.accent, fontFamily: brMono, fontSize: 11,
                fontWeight: 700, paddingTop: 5,
              }}>0{i + 1}</span>
              <span>{em(it)}</span>
            </li>
          ))}
        </ul>
      )

    case 'code':
      return (
        <figure style={{ margin: '0 0 24px' }}>
          <pre style={{
            margin: 0, overflowX: 'auto',
            background: BR.ink, color: '#e8e6e0',
            padding: isMobile ? '16px' : '18px 20px',
            fontFamily: brMono, fontSize: 13, lineHeight: 1.7,
            whiteSpace: 'pre',
          }}>{b.t}</pre>
          {b.cap && (
            <figcaption style={{
              marginTop: 8, fontFamily: brMono, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: BR.muted,
              lineHeight: 1.5,
            }}>{b.cap}</figcaption>
          )}
        </figure>
      )

    // Jargon explainer. Visually distinct from <note> — this one is a
    // dictionary aside, so it gets the paper card and a term heading, and
    // it always sits immediately after the sentence that used the word.
    case 'plain':
      return (
        <aside style={{
          margin: '0 0 24px',
          borderLeft: `4px solid ${BR.ink}`, background: BR.paper,
          padding: isMobile ? '16px' : '18px 22px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
            marginBottom: 8,
          }}>
            <span style={{
              fontFamily: brMono, fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              background: BR.ink, color: BR.bg, padding: '3px 7px',
            }}>IN PLAIN TERMS</span>
            <span style={{
              fontFamily: brFont, fontWeight: 900, fontSize: 16,
              textTransform: 'uppercase', letterSpacing: '-0.01em', color: BR.ink,
            }}>{b.term}</span>
          </div>
          <div style={{
            fontFamily: brFont, fontSize: 16, lineHeight: 1.6, color: '#222',
          }}>{em(b.t)}</div>
        </aside>
      )

    case 'note':
      return (
        <aside style={{
          margin: '0 0 24px',
          border: `2px solid ${BR.ink}`, background: BR.paper,
          padding: isMobile ? '16px' : '18px 22px',
        }}>
          <div style={{
            fontFamily: brMono, fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.16em',
            color: BR.accent, marginBottom: 8,
          }}>{b.label}</div>
          <div style={{
            fontFamily: brFont, fontSize: 16, lineHeight: 1.55, color: '#222',
          }}>{em(b.t)}</div>
        </aside>
      )
  }
}

// The entire inline markup language: *text* renders italic. Splitting on a
// single delimiter keeps this a four-line function instead of a dependency.
function em(text: string) {
  const parts = text.split('*')
  return parts.map((s, i) => (i % 2 ? <i key={i}>{s}</i> : s))
}

// ─── 404 ─────────────────────────────────────────────────────────────────
function NotFound() {
  const isMobile = useIsMobile()
  return (
    <section style={{
      borderBottom: `4px solid ${BR.ink}`,
      padding: isMobile ? '40px 20px 48px' : '60px 32px 72px',
    }}>
      <div style={shell}>
      <div style={{
        fontFamily: brMono, fontSize: 11, color: BR.muted,
        textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12,
      }}>
        <span style={{ color: BR.accent, marginRight: 8 }}>●</span>
        TICKET NOT FOUND · CLOSED AS WON'T FIX
      </div>
      <h1 style={{
        margin: 0, fontFamily: brFont, fontWeight: 900,
        fontSize: 'clamp(40px, 9vw, 110px)', lineHeight: 0.9,
        letterSpacing: '-0.05em', textTransform: 'uppercase',
      }}>
        NO SUCH POST<span style={{ color: BR.accent }}>.</span>
      </h1>
      <p style={{
        margin: '22px 0 28px', fontFamily: brFont, fontSize: 18,
        lineHeight: 1.55, color: '#333', maxWidth: 620,
      }}>
        Either this one has not been written yet, or the link is old. Both are
        plausible. The dev log index has everything that actually exists.
      </p>
      <Link to="/blog" style={{
        display: 'inline-flex', alignItems: 'center',
        background: BR.accent, color: '#000', textDecoration: 'none',
        padding: '18px 24px', fontFamily: brFont, fontWeight: 900, fontSize: 17,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>← BACK TO THE DEV LOG</Link>
      </div>
    </section>
  )
}
