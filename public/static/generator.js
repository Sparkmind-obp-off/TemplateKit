/**
 * TemplateKit — Generator UI (Module 02)
 * Ref: DOC 04 (User Journey) | DOC 08 §21–§31, §58
 *
 * Flow: Input → Generate → Result → Copy → Generate More
 */

(function () {
  'use strict'

  var form = document.getElementById('generator-form')
  if (!form) return

  var resultArea = document.getElementById('result-area')
  var generateBtn = document.getElementById('generate-btn')
  var generateBtnLabel = document.getElementById('generate-btn-label')
  var toast = document.getElementById('toast')
  var toastText = document.getElementById('toast-text')

  var fields = {
    topic: document.getElementById('field-topic'),
    audience: document.getElementById('field-audience'),
    contentType: document.getElementById('field-content-type'),
    tone: document.getElementById('field-tone'),
    count: document.getElementById('field-count')
  }

  // State generation terakhir (dipakai untuk Generate More)
  var state = {
    generationId: null,
    input: null,
    hooks: [],
    loading: false
  }

  var A = window.TKAnalytics || { track: function () {}, sessionId: 'anon', source: null }

  // ── Helpers ────────────────────────────────────────────────────────

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function showToast(msg) {
    if (!toast || !toastText) return
    toastText.textContent = msg
    toast.setAttribute('data-show', 'true')
    clearTimeout(toast._t)
    toast._t = setTimeout(function () {
      toast.setAttribute('data-show', 'false')
    }, 1800)
  }

  function setFieldError(name, message) {
    var wrap = document.getElementById('field-wrap-' + name)
    var errEl = document.getElementById('field-error-' + name)
    if (!wrap || !errEl) return
    if (message) {
      wrap.setAttribute('data-error', 'true')
      errEl.textContent = message
    } else {
      wrap.setAttribute('data-error', 'false')
      errEl.textContent = ''
    }
  }

  function clearErrors() {
    setFieldError('topic', '')
    setFieldError('audience', '')
  }

  function readInput() {
    return {
      topic: (fields.topic.value || '').trim(),
      audience: (fields.audience.value || '').trim(),
      contentType: fields.contentType ? fields.contentType.value : 'general',
      tone: fields.tone ? fields.tone.value : 'casual',
      count: fields.count ? Number(fields.count.value) : 5
    }
  }

  function setLoading(on, label) {
    state.loading = on
    generateBtn.disabled = on
    if (on) {
      generateBtnLabel.innerHTML =
        '<span class="tk-spinner" aria-hidden="true"></span>' + esc(label || 'Sedang membuat hook...')
    } else {
      generateBtnLabel.textContent = 'Generate Hooks'
    }
    // disable juga tombol aksi di area hasil
    var actionBtns = resultArea.querySelectorAll('button')
    for (var i = 0; i < actionBtns.length; i++) actionBtns[i].disabled = on
  }

  // ── Renderers (DOC 08 §25–§29) ─────────────────────────────────────

  function renderEmpty() {
    resultArea.innerHTML =
      '<div class="tk-state">' +
      '<div class="tk-state__icon" aria-hidden="true">' + icon('sparkle') + '</div>' +
      '<p class="tk-state__title">Hook kamu akan muncul di sini.</p>' +
      '<p class="tk-state__sub">Masukkan topik dan target audience untuk mulai.</p>' +
      '</div>'
  }

  function renderLoading(count) {
    var n = Math.min(count || 5, 5)
    var cards = ''
    for (var i = 0; i < n; i++) {
      cards +=
        '<div class="tk-skel__card">' +
        '<div class="tk-skel__line tk-skel__line--sm"></div>' +
        '<div class="tk-skel__line tk-skel__line--lg"></div>' +
        '<div class="tk-skel__line" style="width:62%"></div>' +
        '</div>'
    }
    resultArea.innerHTML =
      '<p class="tk-loading__label" role="status">' +
      '<span class="tk-spinner" aria-hidden="true"></span> Sedang membuat hook...' +
      '</p><div class="tk-skel">' + cards + '</div>'
  }

  function renderError(message, canRetry) {
    resultArea.innerHTML =
      '<div class="tk-state tk-state--error" role="alert">' +
      '<div class="tk-state__icon" aria-hidden="true">' + icon('alert') + '</div>' +
      '<p class="tk-state__title">Ups, hook belum berhasil dibuat.</p>' +
      '<p class="tk-state__sub">' + esc(message) + '</p>' +
      (canRetry
        ? '<div class="tk-state__actions">' +
          '<button type="button" class="tk-btn tk-btn--primary" id="retry-btn">Coba Lagi</button>' +
          '</div>'
        : '') +
      '</div>'

    var retry = document.getElementById('retry-btn')
    if (retry) {
      retry.addEventListener('click', function () {
        runGenerate(false)
      })
    }
  }

  function renderResults(isAppend) {
    var hooks = state.hooks
    var cards = hooks
      .map(function (h, i) {
        return (
          '<article class="tk-hook" style="animation-delay:' +
          Math.min(i * 40, 240) +
          'ms">' +
          '<div class="tk-hook__top">' +
          '<span class="tk-hook__num">HOOK #' + (i + 1) + '</span>' +
          '<button type="button" class="tk-btn tk-btn--secondary tk-btn--sm tk-copy" data-copy-index="' +
          i +
          '" aria-label="Copy hook nomor ' + (i + 1) + '">' +
          icon('copy') + '<span>Copy</span>' +
          '</button>' +
          '</div>' +
          '<p class="tk-hook__text">' + esc(h.text) + '</p>' +
          '<div class="tk-hook__foot">' +
          '<div class="tk-hook__tags">' +
          '<span class="tk-badge">' + esc(h.framework || '') + '</span>' +
          (h.angle ? '<span class="tk-badge tk-badge--neutral">' + esc(h.angle) + '</span>' : '') +
          '</div>' +
          '<div class="tk-hook__actions">' +
          '<button type="button" class="tk-icon-btn" data-feedback="positive" data-kind="up" data-hook-id="' +
          esc(h.id) + '" aria-label="Hook ini bagus">' + icon('up') + '</button>' +
          '<button type="button" class="tk-icon-btn" data-feedback="negative" data-kind="down" data-hook-id="' +
          esc(h.id) + '" aria-label="Hook ini kurang cocok">' + icon('down') + '</button>' +
          '</div>' +
          '</div>' +
          '</article>'
        )
      })
      .join('')

    resultArea.innerHTML =
      '<div class="tk-results__head">' +
      '<h2 class="tk-results__title">Hasil Hook</h2>' +
      '<p class="tk-results__meta" role="status">' + hooks.length + ' hook siap dipakai</p>' +
      '</div>' +
      '<div class="tk-results__list">' + cards + '</div>' +
      '<div class="tk-results__actions">' +
      '<button type="button" class="tk-btn tk-btn--secondary" id="generate-more-btn">' +
      icon('refresh') + '<span>Generate More</span></button>' +
      '<button type="button" class="tk-btn tk-btn--tertiary" id="create-another-btn">Buat Hook Baru</button>' +
      '</div>'

    bindResultActions()

    if (!isAppend) {
      // fokus ke hasil untuk mobile UX
      if (window.matchMedia('(max-width: 959px)').matches) {
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  function bindResultActions() {
    // Copy (DOC 08 §24)
    var copyBtns = resultArea.querySelectorAll('[data-copy-index]')
    Array.prototype.forEach.call(copyBtns, function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-copy-index'))
        var hook = state.hooks[idx]
        if (!hook) return
        copyText(hook.text, function (ok) {
          if (!ok) {
            showToast('Gagal copy. Coba salin manual.')
            return
          }
          btn.setAttribute('data-copied', 'true')
          btn.querySelector('span').textContent = 'Copied ✓'
          showToast('Copied ✓')
          A.track('copy_click', state.generationId, {
            hookId: hook.id,
            frameworkId: hook.frameworkId
          })
          setTimeout(function () {
            btn.setAttribute('data-copied', 'false')
            var s = btn.querySelector('span')
            if (s) s.textContent = 'Copy'
          }, 1600)
        })
      })
    })

    // Feedback
    var fbBtns = resultArea.querySelectorAll('[data-feedback]')
    Array.prototype.forEach.call(fbBtns, function (btn) {
      btn.addEventListener('click', function () {
        var rating = btn.getAttribute('data-feedback')
        var hookId = btn.getAttribute('data-hook-id')
        if (btn.getAttribute('data-active') === 'true') return

        // reset sibling
        var parent = btn.parentNode
        Array.prototype.forEach.call(parent.querySelectorAll('[data-feedback]'), function (b) {
          b.setAttribute('data-active', 'false')
        })
        btn.setAttribute('data-active', 'true')

        sendFeedback(hookId, rating)
        showToast(rating === 'positive' ? 'Makasih! Dicatat ✓' : 'Noted, kami perbaiki ✓')
      })
    })

    // Generate More (DOC 08 §30)
    var moreBtn = document.getElementById('generate-more-btn')
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        A.track('regenerate_click', state.generationId, { existing: state.hooks.length })
        runGenerate(true)
      })
    }

    // Buat Hook Baru (DOC 08 §31)
    var anotherBtn = document.getElementById('create-another-btn')
    if (anotherBtn) {
      anotherBtn.addEventListener('click', function () {
        A.track('create_another_click', state.generationId, {})
        state = { generationId: null, input: null, hooks: [], loading: false }
        form.reset()
        clearErrors()
        renderEmpty()
        fields.topic.focus()
        if (window.matchMedia('(max-width: 959px)').matches) {
          form.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    }
  }

  // ── Copy with fallback ─────────────────────────────────────────────

  function copyText(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          cb(true)
        },
        function () {
          cb(legacyCopy(text))
        }
      )
    } else {
      cb(legacyCopy(text))
    }
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      var ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch (e) {
      return false
    }
  }

  // ── API calls ──────────────────────────────────────────────────────

  function apiHeaders() {
    var h = { 'Content-Type': 'application/json', 'x-session-id': A.sessionId }
    if (A.source) h['x-tk-source'] = A.source
    return h
  }

  function sendFeedback(hookId, rating) {
    if (!state.generationId) return
    var body = { generationId: state.generationId, hookId: hookId, rating: rating }
    if (rating === 'negative') body.reason = 'too_generic'
    fetch('/api/feedback', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body)
    }).catch(function () {})
  }

  function runGenerate(isMore) {
    if (state.loading) return

    var input = isMore && state.input ? state.input : readInput()

    // Client-side validation (server tetap memvalidasi ulang)
    clearErrors()
    var invalid = false
    if (!input.topic) {
      setFieldError('topic', 'Topik wajib diisi.')
      invalid = true
    }
    if (!input.audience) {
      setFieldError('audience', 'Target audience wajib diisi.')
      invalid = true
    }
    if (invalid) {
      var firstErr = form.querySelector('[data-error="true"] input, [data-error="true"] select')
      if (firstErr) firstErr.focus()
      return
    }

    state.input = input

    var payload = {
      topic: input.topic,
      audience: input.audience,
      contentType: input.contentType || 'general',
      tone: input.tone || 'casual',
      count: input.count || 5
    }

    if (isMore && state.hooks.length > 0) {
      payload.excludeHooks = state.hooks
        .map(function (h) {
          return h.text
        })
        .slice(-20)
    }

    A.track('generate_click', null, {
      contentType: payload.contentType,
      tone: payload.tone,
      count: payload.count,
      regenerate: !!isMore
    })

    setLoading(true, 'Sedang membuat hook...')
    renderLoading(payload.count)

    fetch('/api/generate', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data }
        })
      })
      .then(function (r) {
        setLoading(false)

        if (r.status === 200 && r.data && r.data.hooks) {
          state.generationId = r.data.generationId
          if (isMore) {
            // Generate More: tambahkan hook baru di bawah
            var seen = {}
            state.hooks.forEach(function (h) {
              seen[h.text.toLowerCase()] = true
            })
            var fresh = r.data.hooks.filter(function (h) {
              return !seen[String(h.text).toLowerCase()]
            })
            state.hooks = state.hooks.concat(fresh)
            renderResults(true)
            showToast(fresh.length + ' hook baru ditambahkan')
          } else {
            state.hooks = r.data.hooks
            renderResults(false)
            showToast(r.data.hooks.length + ' hook berhasil dibuat')
          }
          return
        }

        // Error handling
        var msg =
          (r.data && r.data.message) || 'Coba lagi dalam beberapa saat.'

        // Validation error → tampilkan dekat field (DOC 08 §20)
        if (r.status === 400 && r.data) {
          if (/topik/i.test(msg)) setFieldError('topic', msg)
          else if (/audience/i.test(msg)) setFieldError('audience', msg)
        }

        if (isMore && state.hooks.length > 0) {
          // jangan buang hasil sebelumnya
          renderResults(true)
          showToast(msg)
        } else {
          renderError(msg, r.status !== 400)
        }
      })
      .catch(function () {
        setLoading(false)
        var msg = 'Koneksi bermasalah. Coba lagi.'
        if (isMore && state.hooks.length > 0) {
          renderResults(true)
          showToast(msg)
        } else {
          renderError(msg, true)
        }
      })
  }

  // ── Icons (single family, inline SVG) ──────────────────────────────

  function icon(name) {
    var paths = {
      copy:
        '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
      refresh:
        '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
      up: '<path d="M7 10v11"/><path d="M11 3.5 7 10h9.6a2 2 0 0 1 2 2.3l-1.1 6.4a2 2 0 0 1-2 1.7H7"/>',
      down: '<path d="M17 14V3"/><path d="M13 20.5 17 14H7.4a2 2 0 0 1-2-2.3l1.1-6.4a2 2 0 0 1 2-1.7H17"/>',
      sparkle:
        '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"/>',
      alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
    }
    return (
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (paths[name] || '') +
      '</svg>'
    )
  }

  // ── Init ───────────────────────────────────────────────────────────

  form.addEventListener('submit', function (e) {
    e.preventDefault()
    runGenerate(false)
  })

  // hilangkan error saat user mulai mengetik
  ;['topic', 'audience'].forEach(function (n) {
    if (fields[n]) {
      fields[n].addEventListener('input', function () {
        setFieldError(n, '')
      })
    }
  })

  // Prefill dari query string (dipakai CTA TikTok / demo)
  try {
    var q = new URLSearchParams(window.location.search)
    if (q.get('topic')) fields.topic.value = q.get('topic').slice(0, 200)
    if (q.get('audience')) fields.audience.value = q.get('audience').slice(0, 200)
  } catch (e) {
    /* ignore */
  }

  renderEmpty()
  A.track('generator_view', null, { path: window.location.pathname })
})()
