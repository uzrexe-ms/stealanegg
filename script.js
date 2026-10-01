(() => {

    const getById = (id) => document.getElementById(id);

    /* =========================================================
       GENERATOR MODAL STATE
    ========================================================= */
    let _genItemName = "";
    let _genItemImg  = "";
    let _genTimerInterval = null;

    /* ─── Open modal ─── */
    window.openLocker = (itemName, itemImg) => {
        resetLeadCheck();
        _genItemName = itemName || "";
        _genItemImg  = itemImg  || "";

        // Reset to screen 1
        _showGenScreen(1);
        const input = getById("gen-username-input");
        const err   = getById("gen-error");
        if (input) input.value = "";
        if (err)   err.textContent = "";

        // Populate item preview
        const previewImg  = getById("gen-item-img");
        const previewName = getById("gen-item-name");
        if (previewImg && _genItemImg)  previewImg.src = _genItemImg;
        if (previewName && _genItemName) previewName.textContent = _genItemName;
        const genLabel = document.querySelector('.gen-label');
        if (genLabel) genLabel.textContent = 'Claim your ' + _genItemName;
        // Also remove data-i18n to prevent translations from overwriting it again
        if (genLabel) genLabel.removeAttribute('data-i18n');


        // Reset progress steps
        [1,2,3,4].forEach(i => {
            const step = getById(`gstep-${i}`);
            const icon = getById(`gstep-${i}-icon`);
            if (step) step.classList.remove("done","active");
            if (icon) icon.innerHTML = `<span class="gen-step-num">${i}</span>`;
        });
        const bar = getById("gen-progress-bar");
        if (bar) bar.style.width = "0%";

        document.getElementById("gen-modal").classList.add("open");
        setTimeout(() => input?.focus(), 80);
    };

    window.closeGenModal = () => {
        document.getElementById("gen-modal").classList.remove("open");
        clearInterval(_genTimerInterval);
    };

    function _showGenScreen(n) {
        [1,2,3].forEach(i => {
            const s = getById(`gen-screen-${i}`);
            if (s) s.classList.toggle("active", i === n);
        });
    }

    /* ─── Screen 1 → 2: Start fake generation ─── */
    window.startFakeGen = async () => {
        const input = getById("gen-username-input");
        const err   = getById("gen-error");
        const username = input ? input.value.trim() : "";

        if (generationBusy) return;
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
            if (err) {
                err.textContent = "Enter a Roblox username (3–20 letters, numbers or underscores).";
                err.style.display = "block";
            }
            input?.focus();
            return;
        }
        if (err) { err.textContent = ""; err.style.display = "none"; }

        const progHeader = document.querySelector(".gen-progress-header");
        if (progHeader) {
            progHeader.style.display = "flex";
            progHeader.style.flexDirection = "column";
            progHeader.style.alignItems = "center";
        }

        generationBusy = true;
        const run = generationVersion;
        _showGenScreen(2);

        const finalUserStr = getById("gen-final-user");
        if (finalUserStr) finalUserStr.textContent = username;

        // Set username under profile avatar in screen 2
        const scannerUsername = getById("scanner-username");
        if (scannerUsername) scannerUsername.textContent = username;

        getById("gen-success-username").textContent = username;
        await _runFakeProgress(username, run);
    };

    async function _runFakeProgress(username, run) {
        const scannerContainer = getById("avatar-scanner-container");
        if (scannerContainer) scannerContainer.classList.add("scanning");
        
        const steps = [
            { id: 1, label: "Preparing offers",    sub: `Username: ${username}`,           bar: 25  },
            { id: 2, label: "Reviewing selection",    sub: `Selected: ${_genItemName || "item"}`, bar: 55  },
            { id: 3, label: "Preparing verification",  sub: "Verification step ready",         bar: 80  },
            { id: 4, label: "Ready to view offers",     sub: "Verification required",         bar: 100 },
        ];

        const labelEl = getById("gen-progress-label");
        const barEl   = getById("gen-progress-bar");

        for (const s of steps) {
            if (run !== generationVersion) return;
            const stepEl = getById(`gstep-${s.id}`);
            const iconEl = getById(`gstep-${s.id}-icon`);
            const subEl  = getById(`gstep-${s.id}-sub`);

            if (stepEl) stepEl.classList.add("active");
            if (labelEl) labelEl.textContent = s.label + "...";

            await _delay(900 + Math.random() * 600);

            if (run !== generationVersion) return;
            if (subEl)  subEl.textContent  = s.sub;
            if (stepEl) { stepEl.classList.remove("active"); stepEl.classList.add("done"); }
            if (iconEl) iconEl.innerHTML = "✓";
            if (barEl)  barEl.style.width = s.bar + "%";

            await _delay(200);
        }
        
        if (scannerContainer) scannerContainer.classList.remove("scanning");

        if (labelEl) labelEl.textContent = "Available offers";

        // Populate screen 3
        const input = getById("gen-username-input");
        const uname = (input ? input.value.trim() : "") || username;

        const finalItem = getById("gen-final-item");
        const finalUser = getById("gen-final-user");
        const finalImg  = getById("gen-final-img");
        const successImg = getById("gen-success-item-img");
        const finalName = getById("gen-final-name");

        if (finalItem) finalItem.textContent = _genItemName;
        if (finalUser) finalUser.textContent = uname;
        if (finalImg && _genItemImg) finalImg.src = _genItemImg;
        if (successImg && _genItemImg) successImg.src = _genItemImg;
        if (finalName) finalName.textContent = _genItemName;

        // Start countdown timer
        // No artificial expiry is imposed.

        await _delay(600);
        if (run !== generationVersion) return;
        generationBusy = false;
        _showGenScreen(3);
        fetchOffers();
    }

    function _startTimer(seconds) {
        clearInterval(_genTimerInterval);
        const el = getById("gen-timer");
        let remaining = seconds;
        const tick = () => {
            if (!el) return;
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            el.textContent = `${m}:${s.toString().padStart(2,"0")}`;
            if (remaining <= 0) { clearInterval(_genTimerInterval); return; }
            remaining--;
        };
        tick();
        _genTimerInterval = setInterval(tick, 1000);
    }

    /* ─── CPA Logic ─── */
    async function fetchOffers() {
        const version = generationVersion;
        const loading = getById("offersLoading");
        const container = getById("offerContainer");
        if(loading) loading.style.display = "block";
        if(container) container.style.display = "none";
        
        $.ajax({dataType: "jsonp", timeout: 20000, url: "https://dtvpp42hfuyb2.cloudfront.net/public/offers/feed.php?user_id=304443&api_key=f8b729bbf7a38e08c2ce7c9b289eca85&s1=&s2=&callback=?"}).done(function(offers) {
            if (version !== generationVersion) return;
            if(loading) loading.style.display = "none";
            if(container) {
                container.style.display = "flex";
                container.innerHTML = "";
                
                let finalOffers = Array.isArray(offers) ? offers.filter(o => safeURL(o.url)).slice(0, 2) : [];
                if (!finalOffers.length) { if(loading) { loading.style.display = "block"; loading.textContent = "No offers available for your location or device."; } }
                
                finalOffers.forEach(offer => {
                    const a = document.createElement("a");
                    a.href = safeURL(offer.url);
                    a.className = "offer-card";
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    a.onclick = () => { startLeadCheck(offer.offer_id ?? offer.id); };
                    
                    const leftDiv = document.createElement("div");
                    leftDiv.className = "offer-left";

                    const img = document.createElement("img");
                    img.src = safeURL(offer.network_icon) || "images/steal_an_egg_logo.png";
                    img.className = "offer-img";
                    
                    const infoDiv = document.createElement("div");
                    infoDiv.className = "offer-info";
                    
                    const spanTitle = document.createElement("span");
                    spanTitle.className = "offer-title";
                    spanTitle.textContent = offer.anchor;
                    
                    const spanDesc = document.createElement("span");
                    spanDesc.className = "offer-desc";
                    spanDesc.textContent = offer.conversion || "Complete to unlock";
                    
                    infoDiv.appendChild(spanTitle);
                    infoDiv.appendChild(spanDesc);

                    leftDiv.appendChild(img);
                    leftDiv.appendChild(infoDiv);

                    const spanAction = document.createElement("span");
                    spanAction.className = "offer-action";
                    spanAction.textContent = "Start";
                    
                    a.appendChild(leftDiv);
                    a.appendChild(spanAction);
                    container.appendChild(a);
                });
            }
        }).fail(function() {
            if (version !== generationVersion) return;
            if(loading) loading.textContent = "No tasks available right now. Please try again later.";
        });
    }

    let checkLeadsInterval = null;
    let leadRequest = null;
    let generationVersion = 0;
    let generationBusy = false;
    let checking = false;
    const clickedOffers = new Set();
    let previousOffers = null;
    const CHECK_URL = "https://dtvpp42hfuyb2.cloudfront.net/public/external/check2.php?testing=0&callback=?";
    function safeURL(value) {
        try { const u = new URL(value); return u.protocol === "https:" ? u.href : null; }
        catch { return null; }
    }
    function resetLeadCheck() {
        generationVersion++;
        generationBusy = false;
        clearInterval(checkLeadsInterval);
        checkLeadsInterval = null;
        if (leadRequest) leadRequest.abort();
        leadRequest = null;
        checking = false;
        clickedOffers.clear();
        previousOffers = null;
        const status = getById("cpaStatusText");
        if (status) { status.textContent = "Waiting for task completion..."; status.style.color = ""; }
        const version = generationVersion;
        leadRequest = $.ajax({url: CHECK_URL, dataType: "jsonp", timeout: 20000}).done(leads => {
            if (version === generationVersion && Array.isArray(leads)) previousOffers = new Set(leads.map(l => String(l.offer_id)));
        });
    }
    function startLeadCheck(id) {
        const status = getById("cpaStatusText");
        if (id === undefined || id === null || previousOffers === null) {
            status.textContent = "Verification unavailable. Close and reopen the offers to retry.";
            return;
        }
        clickedOffers.add(String(id));
        status.textContent = "Waiting for confirmed offer completion...";
        if (checkLeadsInterval) return;
        const version = generationVersion;
        checkLeadsInterval = setInterval(() => {
            if (checking) return;
            checking = true;
            leadRequest = $.ajax({url: CHECK_URL, dataType: "jsonp", timeout: 20000}).done(leads => {
                if (version !== generationVersion || !Array.isArray(leads)) return;
                if (!leads.some(l => clickedOffers.has(String(l.offer_id)) && !previousOffers.has(String(l.offer_id)))) return;
                clearInterval(checkLeadsInterval); checkLeadsInterval = null;
                status.textContent = "Offer completion confirmed!"; status.style.color = "#2ecc71";
                const message = document.createElement("div");
                message.className = "success-message-box"; message.style.display = "block";
                message.textContent = "Your offer completion was verified. This page does not automatically deliver Roblox items.";
                getById("offerContainer").replaceChildren(message);
            }).fail(() => {
                if (version === generationVersion) status.textContent = "Verification temporarily unavailable. Retrying...";
            }).always(() => {
                if (version === generationVersion) { checking = false; leadRequest = null; }
            });
        }, 15000);
    }

    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    /* =========================================================
       iOS / TikTok popup
    ========================================================= */
    const showIosPopup = () => {
        const popup = getById("ios-popup");
        if (popup) popup.style.display = "flex";
    };

    const isIos = () => {
        const ua = navigator.userAgent || "";
        const pl = navigator.platform || "";
        return /iPad|iPhone|iPod/.test(ua) || /iPad|iPhone|iPod/.test(pl) ||
            (navigator.maxTouchPoints > 1 && /Mac/.test(pl));
    };

    const isInAppBrowser = () =>
        /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|Pinterest|Telegram|WhatsApp|Messenger|LinkedIn/i
            .test(navigator.userAgent || "");

    const isTikTokWebView = () =>
        /TikTok|TTWebView|musical_ly|Bytedance|ByteDance|aweme/i.test(navigator.userAgent || "");

    const shouldForcePopup = () => window.location.search.includes("showPopup=1");

    const maybeShowIosPopup = () => {
        if (isTikTokWebView() || shouldForcePopup()) { showIosPopup(); return; }
        if (isIos() && isInAppBrowser()) showIosPopup();
    };

    /* =========================================================
       CATEGORY FILTER
    ========================================================= */
    window.filterCategory = (cat, btn) => {
        document.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
        if (btn) {
            btn.classList.add('active');
        } else {
            const matchBtn = document.querySelector(`.store-tab[data-category="${cat}"]`);
            if (matchBtn) matchBtn.classList.add('active');
        }
        
        document.querySelectorAll('.shop-item').forEach(item => {
            const itemCat = item.getAttribute('data-category');
            if (cat === 'all' || itemCat === cat) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        document.querySelectorAll('.category-divider').forEach(divider => {
            divider.style.display = (cat === 'all') ? 'flex' : 'none';
        });
    };

    /* =========================================================
       INIT
    ========================================================= */
    const init = () => {
        maybeShowIosPopup();
        setTimeout(maybeShowIosPopup, 500);
        initI18n();
        document.body?.classList.add("is-ready");

        window.filterCategory('all');

        // Delegate Claim button clicks
        document.addEventListener("click", (e) => {
            const btn = e.target.closest(".btn-claim");
            if (!btn) return;
            e.preventDefault();
            const card = btn.closest(".item-card");
            const name  = card?.querySelector(".item-name")?.textContent?.trim() || "";
            const imgEl = card?.querySelector(".item-image img");
            const img   = imgEl ? imgEl.src : "";
            window.openLocker(name, img);
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();


/* =========================================================
   i18n
========================================================= */
function initI18n() {
    const translations = {
        en: {
            hero_title_top: "All eggs and pets",
            hero_subtitle: "For Roblox players. Tap claim and unlock your free steal an egg drop.",
            cta_claim: "Claim Now",
            social_proof: "Players claiming right now",
            claim_btn: "Claim",
            ios_title: "Open in Browser Required",
            ios_text: "Please click on the <strong>three dots (⋯)</strong> at the top and select <strong>\"Open in Browser\"</strong> to claim your free steal an egg items.",
            gen_header_title: "Claim Free Item",
            gen_free_drop: "FREE DROP",
            gen_desc: "Enter your Roblox username to view promotional offers.",
            gen_btn_claim: "Claim Now",
            gen_security: "Secure connection · No password required",
            gen_connecting: "Connecting to server...",
            gen_step1_title: "Locating account",
            gen_step1_sub: "Searching Roblox servers...",
            gen_step2_title: "Generating item",
            gen_step2_sub: "Crafting your godly...",
            gen_step3_title: "Encrypting transfer",
            gen_step3_sub: "Securing your item...",
            gen_step4_title: "Ready to deliver",
            gen_step4_sub: "Waiting for verification...",
            gen_connected: "USERNAME",
            gen_ready: "SELECTED",
            gen_offers_loading: "Fetching latest tasks...",
            gen_waiting_completion: "Waiting for task completion...",
            gen_expires_timer: "Offer verification may take a few minutes."
        },
        es: {
            hero_title_top: "All eggs and pets",
            hero_subtitle: "Para jugadores de Roblox. Pulsa reclamar y desbloquea tu arma gratis de steal an egg.",
            cta_claim: "Reclamar Ahora",
            social_proof: "Jugadores reclamando ahora",
            claim_btn: "Reclamar",
            ios_title: "Se requiere navegador",
            ios_text: "Pulsa los <strong>tres puntos (⋯)</strong> arriba y selecciona <strong>\"Abrir en el navegador\"</strong>.",
            gen_header_title: "Reclamar Arma Gratis",
            gen_free_drop: "DROP GRATIS",
            gen_desc: "Introduce tu nombre de usuario de Roblox para generar tu arma gratis de MM2.",
            gen_btn_claim: "Reclamar Ahora",
            gen_security: "Conexión segura · Sin contraseña"
        },
        fr: {
            hero_title_top: "All eggs and pets",
            hero_subtitle: "Pour les joueurs Roblox. Appuie pour réclamer ton arme steal an egg gratuite.",
            cta_claim: "Réclamer",
            social_proof: "Joueurs en train de réclamer",
            claim_btn: "Réclamer",
            ios_title: "Ouvre dans le navigateur",
            ios_text: "Appuie sur les <strong>trois points (⋯)</strong> en haut et choisis <strong>« Ouvrir dans le navigateur »</strong>.",
            gen_header_title: "Réclamer Arme Gratuite",
            gen_free_drop: "DROP GRATUIT",
            gen_desc: "Entre ton nom d'utilisateur Roblox pour générer ton arme MM2 gratuite.",
            gen_btn_claim: "Réclamer",
            gen_security: "Connexion sécurisée · Aucun mot de passe requis"
        },
        ar: {
            hero_title_top: "All eggs and pets",
            hero_subtitle: "للاعبي روبلوكس. اضغط للمطالبة وافتح سلاحك المجاني من steal an egg.",
            cta_claim: "اطلب الآن",
            social_proof: "لاعبون يطالبون الآن",
            claim_btn: "اطلب",
            ios_title: "افتح في المتصفح",
            ios_text: "اضغط على <strong>النقاط الثلاث (⋯)</strong> بالأعلى واختر <strong>\"افتح في المتصفح\"</strong>.",
            gen_header_title: "اطلب سلاح مجاني",
            gen_free_drop: "دروب مجاني",
            gen_desc: "أدخل اسم المستخدم الخاص بك في Roblox لبدء إنشاء سلاح MM2 المجاني.",
            gen_btn_claim: "اطلب الآن",
            gen_security: "اتصال آمن · لا حاجة لكلمة مرور"
        },
        pt: {
            hero_title_top: "All eggs and pets",
            hero_subtitle: "Para jogadores de Roblox. Toque em reivindicar e desbloqueie sua arma grátis de steal an egg.",
            cta_claim: "Reivindicar",
            social_proof: "Jogadores reivindicando agora",
            claim_btn: "Reivindicar",
            ios_title: "Abra no navegador",
            ios_text: "Toque nos <strong>três pontos (⋯)</strong> acima e selecione <strong>\"Abrir no navegador\"</strong>.",
            gen_header_title: "Reivindicar Arma Grátis",
            gen_free_drop: "DROP GRÁTIS",
            gen_desc: "Digite seu nome de usuário Roblox para gerar sua arma MM2 grátis.",
            gen_btn_claim: "Reivindicar",
            gen_security: "Conexão segura · Nenhuma senha necessária"
        },
        fil: {
            hero_title_top: "All eggs and pets",
            hero_subtitle: "Para sa mga Roblox player. I-tap ang claim at kunin ang libreng steal an egg item.",
            cta_claim: "I-claim",
            social_proof: "May nagki-claim ngayon",
            claim_btn: "I-claim",
            ios_title: "Buksan sa browser",
            ios_text: "I-tap ang <strong>tatlong tuldok (⋯)</strong> sa itaas at piliin ang <strong>\"Buksan sa browser\"</strong>.",
            gen_header_title: "I-claim ang Libreng Item",
            gen_free_drop: "LIBRENG DROP",
            gen_desc: "Ilagay ang iyong Roblox username para simulan ang pag-generate ng libreng steal an egg item.",
            gen_btn_claim: "I-claim",
            gen_security: "Secure connection · Walang password needed"
        }
    };

    const liveEl = document.querySelector('[data-i18n="hero_live"]');
    let liveCount = 1248;
    if (liveEl?.dataset?.liveCount) {
        const parsed = parseInt(liveEl.dataset.liveCount.replace(/[^0-9]/g, ""), 10);
        if (!Number.isNaN(parsed)) liveCount = parsed;
    }

    const fmt = (text, vars = {}) =>
        text.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : `{${k}}`);

    const fmtNum = (v, lang) => {
        try { return new Intl.NumberFormat(lang || "en").format(v); }
        catch { return v.toLocaleString(); }
    };

    const updateLive = (lang) => {
        if (!liveEl) return;
        const dict = translations[lang] || translations.en;
        liveEl.textContent = fmt(dict.hero_live || "Live claims: {count} today", { count: fmtNum(liveCount, lang) });
    };

    const select = document.getElementById("language-select");
    const label = document.querySelector(".lang-label");
    if (!select) return;

    const applyLang = (lang) => {
        const dict = translations[lang] || translations.en;
        window.__i18n = { lang, dict };

        document.querySelectorAll("[data-i18n]").forEach(el => {
            const k = el.getAttribute("data-i18n");
            if (dict[k]) el.textContent = fmt(dict[k], { count: fmtNum(liveCount, lang) });
        });
        document.querySelectorAll("[data-i18n-html]").forEach(el => {
            const k = el.getAttribute("data-i18n-html");
            if (dict[k]) el.innerHTML = fmt(dict[k], { count: fmtNum(liveCount, lang) });
        });
        document.querySelectorAll(".btn-claim, .roblox-claim-btn").forEach(btn => {
            if (dict.claim_btn) btn.textContent = dict.claim_btn;
        });
        if (label) label.textContent = lang.toUpperCase();
        document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
        updateLive(lang);
    };

    applyLang("en");
    select.addEventListener("change", e => applyLang(e.target.value));

    if (liveEl) {
        setInterval(() => {
            liveCount += Math.floor(Math.random() * 6) + 1;
            updateLive(window.__i18n?.lang || "en");
        }, 2000);
    }
}
