import { useEffect } from 'react'
import type { Extension } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

interface TailoringEditorProps {
  label: string
  initialContent?: string
  placeholder?: string
  onChange: (content: string) => void
  readonly?: boolean
}

export const TailoringEditor = ({ label, initialContent, placeholder, onChange, readonly }: TailoringEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write or paste content…',
      }) as Extension,
    ],
    editable: !readonly,
    content: initialContent,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && typeof initialContent === 'string') {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  return (
    <section
      className="glass-card"
      style={{
        padding: '1.25rem',
        display: 'grid',
        gap: '0.75rem',
        borderRadius: 24,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.15rem' }}>
          <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {readonly ? 'Preview' : 'Editor'}
          </span>
          <strong style={{ fontSize: '1.1rem' }}>{label}</strong>
        </div>
        <span
          className="pill"
          style={{
            background: readonly ? 'rgba(148,163,184,0.15)' : 'rgba(99,102,241,0.15)',
            color: readonly ? 'var(--text-muted)' : 'var(--accent-primary)',
            fontSize: 13,
          }}
        >
          {readonly ? 'View only' : 'Live editing'}
        </span>
      </header>

      <div
        style={{
          borderRadius: 20,
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          padding: '0.75rem',
          minHeight: 220,
        }}
      >
        {editor && <EditorContent editor={editor} />}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
        {readonly ? 'This version mirrors what was saved to Drive.' : 'Use the toolbar shortcuts (Ctrl+B/I/U) to format quickly.'}
      </p>
    </section>
  )
}
