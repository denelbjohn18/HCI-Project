import { XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  id: string
  triggerId: string
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * A modeless panel: the page behind it stays usable, so people can read the
 * explanation next to their result instead of trading one for the other.
 */
export function SidePanel({ id, triggerId, title, open, onClose, children }: Props) {
  const panelRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const wasOpen = useRef(open)

  useEffect(() => {
    if (open) {
      headingRef.current?.focus()
    } else if (wasOpen.current) {
      const active = document.activeElement
      if (!active || active === document.body || panelRef.current?.contains(active)) {
        document.getElementById(triggerId)?.focus()
      }
    }
    wasOpen.current = open
  }, [open, triggerId])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <aside
      ref={panelRef}
      id={id}
      className="side-panel"
      data-open={open}
      inert={!open}
      aria-labelledby={`${id}-title`}
    >
      <div className="side-panel__header">
        <h2 id={`${id}-title`} className="label" ref={headingRef} tabIndex={-1}>
          {title}
        </h2>
        <button type="button" className="round-button" onClick={onClose} aria-label={`Close ${title}`}>
          <XIcon size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="side-panel__body">{children}</div>
    </aside>
  )
}
