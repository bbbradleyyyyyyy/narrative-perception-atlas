/**
 * Demo Mode — 独立模块
 * 完全独立于 Simulator，不消耗 API Token
 */
(function (global) {
  'use strict';

  var CASES = global.DEMO_CASES || [];
  var currentCase = null;
  var currentStep = 0;
  var animTimers = [];

  // ============ DOM REFS ============
  function $(id) { return document.getElementById(id); }

  // ============ WELCOME SCREEN ============
  function showWelcome() {
    var el = $('demoWelcomeOverlay');
    if (!el) return;
    el.classList.add('active');
    el.style.display = 'flex';
  }

  function hideWelcome() {
    var el = $('demoWelcomeOverlay');
    if (!el) return;
    el.classList.remove('active');
    el.style.display = 'none';
  }

  function skipDemo() {
    hideWelcome();
    localStorage.setItem('npa_demo_seen', '1');
    // 进入 Simulator，添加小入口
    if (typeof App !== 'undefined' && App.navigateTo) {
      App.navigateTo('simulator');
    }
    addDemoReentryButton();
  }

  // ============ CASE SELECTION ============
  function selectCase(caseId) {
    currentCase = CASES.find(function (c) { return c.id === caseId; });
    if (!currentCase) return;
    hideWelcome();
    localStorage.setItem('npa_demo_seen', '1');
    currentStep = 0;
    renderPlayer();
    showPlayer();
    playStep0();
  }

  // ============ PLAYER OVERLAY ============
  function renderPlayer() {
    var player = $('demoPlayerOverlay');
    if (!player || !currentCase) return;

    var body = player.querySelector('.demo-player-body');
    if (!body) return;

    var lenses = currentCase.lenses;

    // Build Step 1: Input
    var step1Html = '<div class="demo-step" data-dstep="0">' +
      '<div class="demo-step-label">User Input</div>' +
      '<div class="demo-input-display" id="demoTypewriter"></div>' +
      '<div class="demo-step-sublabel">系统正在接收叙事输入...</div>' +
      '</div>';

    // Build Step 2: Lens Retrieval
    var lensCardsHtml = '';
    lenses.forEach(function (l, i) {
      lensCardsHtml += '<div class="demo-lens-card" id="demoLensCard' + i + '">' +
        '<div class="demo-lens-card-header">' +
          '<span class="demo-lens-id">Lens' + String(l.id).padStart(2, '0') + '</span>' +
          '<span class="demo-lens-name">' + l.name + '</span>' +
          '<span class="demo-lens-region">' + l.regionZh + '</span>' +
        '</div>' +
        '<div class="demo-lens-first-imp">' + l.firstImpression + '</div>' +
      '</div>';
    });

    var step2Html = '<div class="demo-step" data-dstep="1">' +
      '<div class="demo-step-label">Selected Lenses · ' + lenses.length + ' 个文化透镜</div>' +
      '<div class="demo-lens-grid" id="demoLensGrid">' + lensCardsHtml + '</div>' +
      '<div class="demo-step-sublabel">每个透镜代表一种独特的文化认知框架</div>' +
      '</div>';

    // Build Step 3: Full Report
    var analysisBlocksHtml = '';
    lenses.forEach(function (l, i) {
      var noticedHtml = l.noticed.map(function (n) {
        return '<li>' + n + '</li>';
      }).join('');
      var ignoredHtml = l.ignored.map(function (n) {
        return '<li>' + n + '</li>';
      }).join('');

      analysisBlocksHtml += '<div class="demo-analysis-lens-block" id="demoAnalysisBlock' + i + '">' +
        '<div class="demo-analysis-lens-title">' +
          '<i class="fa-solid fa-eye"></i> ' + l.name +
          ' <span style="color:var(--text-muted);font-family:VT323,monospace;font-size:11px">' + l.regionZh + '</span>' +
        '</div>' +
        '<div style="margin-bottom:16px">' +
          '<div class="demo-section-label"><i class="fa-solid fa-bolt"></i> First Impression · 第一印象</div>' +
          '<div style="font-size:14px;color:var(--text);line-height:1.8;font-style:italic">' + l.firstImpression + '</div>' +
        '</div>' +
        '<div style="margin-bottom:16px">' +
          '<div class="demo-section-label"><i class="fa-solid fa-magnifying-glass"></i> Noticed · 他们注意到</div>' +
          '<ul class="demo-analysis-list">' + noticedHtml + '</ul>' +
        '</div>' +
        '<div style="margin-bottom:16px">' +
          '<div class="demo-section-label"><i class="fa-solid fa-eye-slash"></i> Ignored · 他们忽略了</div>' +
          '<ul class="demo-analysis-list">' + ignoredHtml + '</ul>' +
        '</div>' +
        '<div class="demo-decode-box">' +
          '<div class="demo-section-label" style="color:var(--gold);margin-bottom:10px"><i class="fa-solid fa-unlock"></i> Cultural Decode · 文化解码</div>' +
          l.decode +
        '</div>' +
      '</div>';
    });

    var step3Html = '<div class="demo-step" data-dstep="2">' +
      '<div class="demo-step-label">Narrative Analysis · 叙事分析报告</div>' +
      '<div style="margin-bottom:20px;padding:14px 18px;border-radius:3px;border:1px solid rgba(244,180,0,0.12);background:rgba(244,180,0,0.03);font-size:13px;color:var(--text-dim);line-height:1.7">' +
        '<i class="fa-solid fa-circle-info" style="color:var(--gold);margin-right:6px"></i>' +
        '同一个 <span style="color:var(--gold);font-weight:500">' + currentCase.title + '</span>，在不同文化 Lens 下，产生了截然不同的意义。' +
      '</div>' +
      '<div class="demo-analysis-container" id="demoAnalysisContainer">' + analysisBlocksHtml + '</div>' +
      '</div>';

    // Build Step 4: CTA
    var step4Html = '<div class="demo-step" data-dstep="3">' +
      '<div class="demo-final-section">' +
        '<div class="demo-final-title">Demo Complete</div>' +
        '<div class="demo-final-sub">' +
          '这是一个预设案例。<br>' +
          '输入你自己的事件、IP 或议题，<br>' +
          '开始真正的跨文化叙事探索。' +
        '</div>' +
        '<div class="demo-final-actions">' +
          '<button class="demo-cta-primary" onclick="DemoMode.goToSimulator()">Analyze Your Own Story</button>' +
          '<button class="demo-cta-secondary" onclick="DemoMode.backToCases()">Explore More Cases</button>' +
        '</div>' +
      '</div>' +
      '</div>';

    body.innerHTML = step1Html + step2Html + step3Html + step4Html;

    // Update header
    var label = player.querySelector('.demo-player-case-label');
    if (label) label.innerHTML = '<span>' + currentCase.title + '</span> · ' + currentCase.titleEn;
  }

  function showPlayer() {
    var el = $('demoPlayerOverlay');
    if (el) { el.classList.add('active'); el.style.display = 'flex'; }
    document.body.style.overflow = 'hidden';
  }

  function hidePlayer() {
    clearAllTimers();
    var el = $('demoPlayerOverlay');
    if (el) { el.classList.remove('active'); el.style.display = 'none'; }
    document.body.style.overflow = '';
  }

  // ============ STEP ANIMATIONS ============
  function setStep(n) {
    currentStep = n;
    document.querySelectorAll('.demo-step').forEach(function (s) {
      s.classList.toggle('active', parseInt(s.getAttribute('data-dstep')) === n);
    });
    updateProgress(n);
  }

  function updateProgress(activeIdx) {
    var dots = document.querySelectorAll('.demo-progress-dot');
    dots.forEach(function (d, i) {
      d.classList.remove('active', 'done');
      if (i === activeIdx) d.classList.add('active');
      else if (i < activeIdx) d.classList.add('done');
    });
    var label = document.querySelector('.demo-progress-label');
    var labels = ['Input', 'Lens Retrieval', 'Narrative Analysis', 'Complete'];
    if (label) label.textContent = labels[activeIdx] || '';
  }

  // Step 0: Typewriter
  function playStep0() {
    setStep(0);
    var target = $('demoTypewriter');
    if (!target || !currentCase) return;
    var text = currentCase.userInput;
    var idx = 0;
    var cursor = '<span class="demo-input-cursor"></span>';

    function typeChar() {
      if (idx < text.length) {
        target.innerHTML = text.substring(0, idx + 1) + cursor;
        idx++;
        animTimers.push(setTimeout(typeChar, 80 + Math.random() * 60));
      } else {
        // Typing done, wait then go to step 1
        animTimers.push(setTimeout(function () {
          target.innerHTML = text;
          playStep1();
        }, 800));
      }
    }
    animTimers.push(setTimeout(typeChar, 600));
  }

  // Step 1: Lens cards reveal one by one
  function playStep1() {
    setStep(1);
    var cards = document.querySelectorAll('.demo-lens-card');
    var lensCount = cards.length;

    cards.forEach(function (card, i) {
      animTimers.push(setTimeout(function () {
        card.classList.add('revealed');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // After last card, go to step 2
        if (i === lensCount - 1) {
          animTimers.push(setTimeout(playStep2, 1200));
        }
      }, i * 600 + 300));
    });
  }

  // Step 2: Analysis blocks reveal with scroll
  function playStep2() {
    setStep(2);
    var blocks = document.querySelectorAll('.demo-analysis-lens-block');
    var body = document.querySelector('.demo-player-body');

    blocks.forEach(function (block, i) {
      animTimers.push(setTimeout(function () {
        block.classList.add('revealed');
        if (body) body.scrollTop = block.offsetTop - 80;

        // After last block, go to step 3
        if (i === blocks.length - 1) {
          animTimers.push(setTimeout(playStep3, 1500));
        }
      }, i * 800 + 400));
    });
  }

  // Step 3: CTA
  function playStep3() {
    setStep(3);
    var body = document.querySelector('.demo-player-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  // ============ NAVIGATION ============
  function goToSimulator() {
    hidePlayer();
    if (typeof App !== 'undefined' && App.navigateTo) {
      App.navigateTo('simulator');
    }
    addDemoReentryButton();
  }

  function backToCases() {
    hidePlayer();
    showWelcome();
  }

  function backFromPlayer() {
    hidePlayer();
    showWelcome();
  }

  // ============ REENTRY BUTTON ============
  function addDemoReentryButton() {
    if ($('demoReentryBtn')) return;
    // Insert into the empty-state hint area (always visible in simulator)
    var emptyHint = document.querySelector('#reportBody > div[style*="display:flex"][style*="flex-direction:column"]');
    if (!emptyHint) {
      // Fallback: append to reportBody
      var reportBody = document.getElementById('reportBody');
      if (!reportBody) return;
      var btn = document.createElement('div');
      btn.id = 'demoReentryBtn';
      btn.style.cssText = 'text-align:center;margin-top:16px';
      btn.innerHTML = '<button class="demo-reentry-btn" onclick="DemoMode.openWelcome()"><i class="fa-solid fa-play" style="font-size:9px"></i> Explore Demo Cases</button>';
      reportBody.appendChild(btn);
      return;
    }
    var btn = document.createElement('div');
    btn.id = 'demoReentryBtn';
    btn.style.cssText = 'text-align:center;margin-top:12px';
    btn.innerHTML = '<button class="demo-reentry-btn" onclick="DemoMode.openWelcome()"><i class="fa-solid fa-play" style="font-size:9px"></i> Explore Demo Cases</button>';
    emptyHint.appendChild(btn);
  }

  // ============ UTILS ============
  function clearAllTimers() {
    animTimers.forEach(function (t) { clearTimeout(t); });
    animTimers = [];
  }

  function openWelcome() {
    showWelcome();
  }

  // ============ INIT ============
  function init() {
    // Check if first visit
    if (!localStorage.getItem('npa_demo_seen')) {
      // Will be triggered after onboarding closes
      return;
    }
  }

  /**
   * Call this after onboarding is closed.
   * Shows Demo Welcome if first visit.
   */
  function onOnboardingClosed() {
    if (localStorage.getItem('npa_demo_seen')) {
      // Not first visit, go to simulator with reentry button
      if (typeof App !== 'undefined' && App.navigateTo) {
        App.navigateTo('simulator');
      }
      addDemoReentryButton();
      return;
    }
    // First visit: show demo welcome
    showWelcome();
  }

  // Expose
  global.DemoMode = {
    init: init,
    showWelcome: showWelcome,
    hideWelcome: hideWelcome,
    selectCase: selectCase,
    skipDemo: skipDemo,
    goToSimulator: goToSimulator,
    backToCases: backToCases,
    backFromPlayer: backFromPlayer,
    openWelcome: openWelcome,
    onOnboardingClosed: onOnboardingClosed
  };

})(typeof window !== 'undefined' ? window : this);
