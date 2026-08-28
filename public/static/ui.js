/**
 * TemplateKit — Base UI interactions
 * Ref: DOC 08 §8 (mobile nav), §34 (FAQ)
 */

(function () {
  'use strict'

  // Mobile nav toggle
  var toggle = document.getElementById('nav-toggle')
  var mobileMenu = document.getElementById('nav-mobile')
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function () {
      var open = mobileMenu.getAttribute('data-open') === 'true'
      mobileMenu.setAttribute('data-open', open ? 'false' : 'true')
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true')
    })
  }

  // FAQ accordion
  var faqItems = document.querySelectorAll('.tk-faq__item')
  Array.prototype.forEach.call(faqItems, function (item) {
    var btn = item.querySelector('.tk-faq__q')
    if (!btn) return
    btn.addEventListener('click', function () {
      var open = item.getAttribute('data-open') === 'true'
      item.setAttribute('data-open', open ? 'false' : 'true')
      btn.setAttribute('aria-expanded', open ? 'false' : 'true')
    })
  })

  // Track CTA clicks ke generator
  var ctas = document.querySelectorAll('[data-tk-cta]')
  Array.prototype.forEach.call(ctas, function (el) {
    el.addEventListener('click', function () {
      if (window.TKAnalytics) {
        window.TKAnalytics.track('generator_view', null, {
          from: el.getAttribute('data-tk-cta') || 'cta'
        })
      }
    })
  })
})()
