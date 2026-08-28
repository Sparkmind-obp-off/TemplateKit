/**
 * TemplateKit — Basic Usage Tracking
 * Ref: DOC 02 §5.6 | DOC 07 §36–§39
 *
 * sessionId anonim (bukan identitas pribadi).
 * Tujuan: mengetahui apakah produk benar-benar digunakan.
 */

(function () {
  'use strict'

  var SESSION_KEY = 'tk_session_id'
  var SOURCE_KEY = 'tk_source'

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID()
    return 'sid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  }

  function getSessionId() {
    var id = null
    try {
      id = localStorage.getItem(SESSION_KEY)
      if (!id) {
        id = uuid()
        localStorage.setItem(SESSION_KEY, id)
      }
    } catch (e) {
      id = window.__tkSessionFallback || (window.__tkSessionFallback = uuid())
    }
    return id
  }

  /** Capture traffic source dari TikTok CTA (mis. ?src=TK-E01) */
  function captureSource() {
    var src = null
    try {
      var params = new URLSearchParams(window.location.search)
      src = params.get('src') || params.get('utm_content') || params.get('utm_source')
      if (src) {
        src = String(src).slice(0, 64)
        localStorage.setItem(SOURCE_KEY, src)
      } else {
        src = localStorage.getItem(SOURCE_KEY)
      }
    } catch (e) {
      /* ignore */
    }
    return src
  }

  var sessionId = getSessionId()
  var source = captureSource()

  function track(event, generationId, metadata) {
    var payload = {
      event: event,
      sessionId: sessionId,
      metadata: metadata || {}
    }
    if (generationId) payload.generationId = generationId

    var headers = { 'Content-Type': 'application/json', 'x-session-id': sessionId }
    if (source) headers['x-tk-source'] = source

    try {
      fetch('/api/event', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {})
    } catch (e) {
      /* analytics tidak boleh mengganggu UX */
    }
  }

  window.TKAnalytics = {
    sessionId: sessionId,
    source: source,
    track: track
  }

  // page_view otomatis
  track('page_view', null, {
    path: window.location.pathname,
    ref: document.referrer ? document.referrer.slice(0, 200) : ''
  })
})()
