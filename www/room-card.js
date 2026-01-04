const TAG_PRIMARY = "room-card";

const THEMES = {
  orange: { mainBg: "#FFE7C6", accentBg: "#EEC690", text: "#7E4400" },
  red: { mainBg: "#FDE6E1", accentBg: "#FFC6AC", text: "#AB2E00" },
  green: { mainBg: "#BDE5D8", accentBg: "#75C7AC", text: "#395144" },
  blue: { mainBg: "#9DF6F2", accentBg: "#4FCAC4", text: "#286764" },
  purple: { mainBg: "#D5D6FF", accentBg: "#A3A4FF", text: "#286764" },
  yellow: { mainBg: "#F3F4B6", accentBg: "#D3D342", text: "#645510" },
};

const DEFAULT_THEME = "orange";

/* Lit loader */
function tryGetHALit() {
  if (window.LitElement && window.html && window.css) {
    return { LitElement: window.LitElement, html: window.html, css: window.css };
  }

  const base =
    customElements.get("ha-panel-lovelace") ||
    customElements.get("hc-main") ||
    customElements.get("home-assistant");

  if (!base) return null;

  const LitElement = Object.getPrototypeOf(base);
  const html = LitElement?.prototype?.html;
  const css = LitElement?.prototype?.css;

  if (!LitElement || !html || !css) return null;
  return { LitElement, html, css };
}

async function getLit() {
  const ha = tryGetHALit();
  if (ha) return ha;

  const mod = await import("https://unpkg.com/lit@2.8.0/index.js?module");
  return { LitElement: mod.LitElement, html: mod.html, css: mod.css };
}

(async () => {
  if (customElements.get(TAG_PRIMARY)) return;

  const { LitElement, html, css } = await getLit();

  class RoomCard extends LitElement {
    static properties = {
      hass: { type: Object },
      _config: { type: Object },
      _theme: { type: Object },
    };

    static styles = css`
      :host {
        display: block;
      }

      /* Card */
      .card {
        position: relative;
        width: 100%;
        max-width: calc(50vw - 16px);
        aspect-ratio: 1 / 1;
        border-radius: 28px;
        background: var(--rc-main-bg);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
        box-sizing: border-box;
        overflow: hidden;
        padding: 0;

        --rc-action-size: clamp(38px, 4.3vw, 44px);
        --rc-action-gap: clamp(8px, 1.2vw, 10px);
        --rc-bubble-size: min(74%, 250px);
        --rc-bubble-ring: clamp(6px, 1.3vw, 8px);
      }

      @media (max-width: 600px) {
        .card {
          max-width: 100%;
        }
      }

      /* Header */
      .content {
        position: relative;
        height: 100%;
        padding: 12px;
        box-sizing: border-box;
        z-index: 2;
      }

      .layout {
        height: 100%;
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 8px;
      }

      .header {
        padding-right: calc(var(--rc-action-size) + 28px);
        padding-left: 5px;
      }

      .title {
        font-weight: 750;
        color: var(--rc-text);
        line-height: 1.15;
        font-size: clamp(18px, 3vw, 26px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .temp {
        font-weight: 650;
        color: var(--rc-text);
        opacity: 0.55;
        font-size: clamp(13px, 2.4vw, 19px);
      }

      /* Actions */
      .actions {
        position: absolute;
        right: 14px;
        top: 14px;
        display: flex;
        flex-direction: column;
        gap: var(--rc-action-gap);
        z-index: 3;
      }

      .action-btn {
        width: var(--rc-action-size);
        height: var(--rc-action-size);
        border-radius: 50%;
        border: none;
        background: var(--rc-accent-bg);
        display: grid;
        place-items: center;
        cursor: pointer;
        padding: 0;
        position: relative;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .action-btn::after {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle at var(--rx, 50%) var(--ry, 50%),
          color-mix(in srgb, var(--rc-text) 35%, transparent) 0%,
          transparent 55%
        );
        opacity: 0;
        transform: scale(0.6);
        transition: opacity 220ms ease, transform 220ms ease;
        pointer-events: none;
      }

      .action-btn.rippling::after,
      .action-btn:active::after {
        opacity: 1;
        transform: scale(1.15);
      }

      /* Presence sensor (non-interactive) */
      .presence-btn {
        /* slightly lighter than mainBg */
        background: color-mix(in srgb, var(--rc-main-bg) 82%, white);
        cursor: default;
        touch-action: none;
      }
      .presence-btn::after {
        display: none; /* no ripple */
      }

      /* Empty action placeholder (keeps spacing/height) */
      .empty-btn {
        background: transparent;
        pointer-events: none;
        cursor: default;
        opacity: 0; /* invisible but keeps height */
      }
      .empty-btn::after {
        display: none; /* no ripple */
      }

      ha-icon {
        --mdc-icon-size: calc(var(--rc-action-size) * 0.5);
        color: var(--rc-text);
      }

      /* Bubble */
      .bubble {
        position: absolute;
        left: calc(var(--rc-bubble-size) * -0.1);
        bottom: calc(var(--rc-bubble-size) * -0.1);
        z-index: 1;
        width: var(--rc-bubble-size);
        height: var(--rc-bubble-size);
        border-radius: 50%;
        background: var(--rc-accent-bg);
        display: grid;
        place-items: center;
        padding: 0;
      }

      .bubble-ring {
        position: absolute;
        inset: calc(var(--rc-bubble-ring) * 1.1 - 1px);
        border-radius: 50%;
        box-sizing: border-box;
        border: clamp(16px, 1.4vw, 20px) solid var(--rc-accent-bg);
        background: transparent;
        z-index: 1;
        pointer-events: none;
        transform: translateZ(0) scale(1.01) translateX(1%) translateY(-1%);
        backface-visibility: hidden;
      }

      .room-img {
        position: relative;
        z-index: 0;
        width: 91%;
        height: 91%;
        border-radius: 50%;
        display: block;
        object-fit: cover;
        transform: translateX(1%) translateY(-1%);
        background: transparent;
      }
    `;

    setConfig(config) {
      if (!config) throw new Error("Config is required");

      const themeName = config.theme || DEFAULT_THEME;
      this._theme = THEMES[themeName] ?? THEMES[DEFAULT_THEME];

      this._config = {
        title: "Room",
        // fallback if no sensor / sensor unavailable
        temperature: "19.8",
        // NEW: entity_id of temperature sensor (if set, used for temperature)
        temperature_sensor: "",
        image: "",
        actions: [],
        ...config,
      };
    }

    getCardSize() {
      return 3;
    }

    /* Data helpers */
    _entityState(entityId) {
      return this.hass?.states?.[entityId]?.state ?? null;
    }

    _tempText() {
      const c = this._config;

      // If a temperature sensor is provided, use hass state
      if (c.temperature_sensor) {
        const s = this._entityState(c.temperature_sensor);

        // ignore unavailable / unknown
        if (s !== null && s !== "unavailable" && s !== "unknown") {
          return `${s} °C`;
        }
      }

      // fallback to config.temperature (always °C)
      return `${c.temperature} °C`;
    }

    _isPresenceSensor(actionCfg) {
      const t = (actionCfg?.action || actionCfg?.type || "").toLowerCase();
      return t === "presence-sensor" || t === "presence_sensor" || t === "presence";
    }

    _isEmptyAction(actionCfg) {
      const t = (actionCfg?.action || actionCfg?.type || "").toLowerCase();
      return t === "empty" || t === "spacer";
    }

    _presenceIsOn(actionCfg) {
      const s = this._entityState(actionCfg.entity);
      return s === "on";
    }

    _pickIcon(actionCfg) {
      if (this._isPresenceSensor(actionCfg)) return "mdi:motion-sensor";

      const state = this._entityState(actionCfg.entity);
      const map = actionCfg.icons_by_state || {};
      return map[state] || map.default || actionCfg.icon || "mdi:help-circle";
    }

    _renderHaIcon(icon) {
      if (customElements.get("ha-icon")) return html`<ha-icon .icon=${icon}></ha-icon>`;
      return html``;
    }

    /* Navigation (Bubble Card pop-up hash) */
    _navigate(path) {
      if (!path) return;
      const p = String(path);
      const url = p.startsWith("#") ? `${location.pathname}${location.search}${p}` : p;
      history.pushState(null, "", url);
      window.dispatchEvent(new Event("location-changed"));
      if (p.startsWith("#")) window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    /* Actions */
    _callAction(cfg) {
      const action = cfg?.action || "none";
      const entity = cfg?.entity;

      if (!this.hass) return;

      // empty/spacer: do nothing
      if (action === "empty" || action === "spacer") return;

      if (action === "bubble-popup") {
        const hash = cfg.hash || cfg.navigation_path;
        if (hash) this._navigate(hash);
        return;
      }

      if (action === "navigate") {
        if (cfg.navigation_path) this._navigate(cfg.navigation_path);
        return;
      }

      if (action === "toggle" && entity) {
        const [domain] = entity.split(".");
        this.hass.callService(domain, "toggle", { entity_id: entity });
        return;
      }

      if (action === "more-info" && entity) {
        this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            detail: { entityId: entity },
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      if (action === "call-service") {
        const { service, service_data, target } = cfg;
        if (!service) return;
        const [domain, srv] = service.split(".");
        this.hass.callService(domain, srv, {
          ...(service_data || {}),
          ...(target?.entity_id ? { entity_id: target.entity_id } : {}),
        });
      }
    }

    /* Ripple */
    _ripple(btn, ev) {
      const rect = btn.getBoundingClientRect();
      const clientX = ev?.clientX ?? rect.left + rect.width / 2;
      const clientY = ev?.clientY ?? rect.top + rect.height / 2;

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;

      btn.style.setProperty("--rx", `${x}%`);
      btn.style.setProperty("--ry", `${y}%`);

      btn.classList.remove("rippling");
      void btn.offsetWidth;
      btn.classList.add("rippling");

      window.clearTimeout(btn._rt);
      btn._rt = window.setTimeout(() => btn.classList.remove("rippling"), 240);
    }

    /* Hold handling (pointer-based, suppress click after hold) */
    _cancelHold() {
      window.clearTimeout(this._holdT);
      this._holdT = null;
    }

    _startHold(actionCfg, ev) {
      this._cancelHold();
      this._holdFired = false;

      if (ev.pointerType === "mouse" && ev.button !== 0) return;

      this._holdT = window.setTimeout(() => {
        this._holdFired = true;
        this._callAction({ ...actionCfg.hold_action, entity: actionCfg.entity });
      }, 420);
    }

    _onActionTap(actionCfg, ev) {
      const btn = ev.currentTarget;

      if (this._holdFired) {
        this._holdFired = false;
        return;
      }

      this._ripple(btn, ev);
      this._callAction({ ...actionCfg.tap_action, entity: actionCfg.entity });
    }

    _onContextHold(actionCfg, ev) {
      ev.preventDefault();
      ev.stopPropagation();
      this._cancelHold();
      this._holdFired = true;
      this._callAction({ ...actionCfg.hold_action, entity: actionCfg.entity });
    }

    _sortedActionsForRender() {
      const list = this._config?.actions || [];

      const normal = [];
      const presence = [];

      for (const a of list) {
        if (this._isPresenceSensor(a)) presence.push(a);
        else normal.push(a);
      }

      // presence sensors: show only when ON, and keep them at the bottom.
      // Also limit to last 4 positions visually.
      const presenceOn = presence.filter((a) => this._presenceIsOn(a)).slice(0, 4);

      return [...normal, ...presenceOn];
    }

    render() {
      if (!this._config) return html``;

      const t = this._theme;
      const c = this._config;
      const img = (c.image || "").trim();
      const actions = this._sortedActionsForRender();

      return html`
        <div
          class="card"
          style="
            --rc-main-bg:${t.mainBg};
            --rc-accent-bg:${t.accentBg};
            --rc-text:${t.text};
          "
        >
          <div class="bubble">
            <div class="bubble-ring" aria-hidden="true"></div>
            ${img ? html`<img class="room-img" src=${img} alt="Room" loading="lazy" />` : html``}
          </div>

          <div class="actions">
            ${actions.map((a) => {
              const isEmpty = this._isEmptyAction(a);
              const isPresence = this._isPresenceSensor(a);
              const icon = this._pickIcon(a);

              // Empty action placeholder: transparent but keeps height/spacing.
              if (isEmpty) {
                return html`<div class="action-btn empty-btn" aria-hidden="true"></div>`;
              }

              // Presence sensor: no tap/hold actions at all (non-interactive).
              if (isPresence) {
                return html`
                  <div class="action-btn presence-btn" aria-label=${a.entity || "presence"} role="img">
                    ${this._renderHaIcon(icon)}
                  </div>
                `;
              }

              // Normal action button
              return html`
                <button
                  class="action-btn"
                  @click=${(ev) => this._onActionTap(a, ev)}
                  @contextmenu=${(ev) => this._onContextHold(a, ev)}
                  @pointerdown=${(ev) => this._startHold(a, ev)}
                  @pointerup=${() => this._cancelHold()}
                  @pointercancel=${() => this._cancelHold()}
                  @pointerleave=${() => this._cancelHold()}
                  aria-label=${a.entity || "action"}
                  type="button"
                >
                  ${this._renderHaIcon(icon)}
                </button>
              `;
            })}
          </div>

          <div class="content">
            <div class="layout">
              <div class="header">
                <div class="title">${c.title}</div>
                <div class="temp">${this._tempText()}</div>
              </div>
              <div></div>
            </div>
          </div>
        </div>
      `;
    }
  }

  customElements.define(TAG_PRIMARY, RoomCard);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: TAG_PRIMARY,
    name: "Room Card",
    description: "Room card",
    preview: true,
  });
})();
