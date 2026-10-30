import { h, render } from 'preact'
import { Widget } from './chat'
import styles from './styles.css?inline'

const script = document.currentScript as HTMLScriptElement | null
const agentKey = script?.dataset.agentKey

if (script && agentKey) {
  const apiBase = new URL(script.src).origin
  const host = document.createElement('div')
  host.setAttribute('data-felops-widget', agentKey)
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = styles
  const mount = document.createElement('div')
  mount.className = 'fw-root'
  shadow.appendChild(style)
  shadow.appendChild(mount)
  document.body.appendChild(host)
  render(h(Widget, { apiBase, agentKey }), mount)
}
