window.__ModuleLoader__.load({
  id: "dsh-workspace-sidebar",
  factory(require) {
    const React = require("react");
    const h = React.createElement;
    const primitives = (() => {
      try {
        return require("@deepseek-ai/dsh-client-ui-primitives");
      } catch (_unavailable) {
        return undefined;
      }
    })();

    const NS = "workspaceSidebar";
    const MODE_KEY = "dsh.workspace-sidebar.v1.mode";
    const ANCHOR_KEY = "dsh.workspace-sidebar.v1.anchors";

    const zh = {
      "setting.title": "按工作区共享侧边栏",
      "setting.description":
        "同一工作区里的对话共用一个会话的右侧栏标签与布局。",
      "chrome.expand": "展开右侧栏",
      "chrome.expandAria": "展开右侧栏",
    };
    const en = {
      "setting.title": "Share the sidebar per workspace",
      "setting.description":
        "Conversations in the same workspace share one conversation’s right-sidebar tabs and layout.",
      "chrome.expand": "Expand right sidebar",
      "chrome.expandAria": "Expand the right sidebar",
    };

    function readMode() {
      try {
        return localStorage.getItem(MODE_KEY) === "conversation"
          ? "conversation"
          : "workspace";
      } catch (_unavailable) {
        return "workspace";
      }
    }

    let anchorCache;
    function readAnchors() {
      if (anchorCache !== undefined) return anchorCache;
      anchorCache = {};
      try {
        const raw = localStorage.getItem(ANCHOR_KEY);
        if (typeof raw === "string" && raw !== "") {
          const parsed = JSON.parse(raw);
          if (
            parsed !== null &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
          ) {
            for (const [workspaceId, sessionId] of Object.entries(parsed)) {
              if (typeof sessionId === "string") {
                anchorCache[workspaceId] = sessionId;
              }
            }
          }
        }
      } catch (_unavailable) {
        // A missing or unreadable anchor just means the next pin chooses one.
      }
      return anchorCache;
    }

    function writeAnchor(workspaceId, sessionId) {
      const anchors = readAnchors();
      if (sessionId === undefined) {
        if (anchors[workspaceId] === undefined) return;
        delete anchors[workspaceId];
      } else {
        if (anchors[workspaceId] === sessionId) return;
        anchors[workspaceId] = sessionId;
      }
      try {
        localStorage.setItem(ANCHOR_KEY, JSON.stringify(anchors));
      } catch (_unavailable) {
        // Sharing still works for this page; the next load re-chooses.
      }
    }

    function createSource(initial) {
      let value = initial;
      const listeners = new Set();
      return {
        getSnapshot: () => value,
        subscribe(listener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        set(next) {
          if (Object.is(value, next)) return;
          value = next;
          for (const listener of listeners) listener();
        },
      };
    }

    function createModeSource() {
      const source = createSource(readMode());
      return {
        getSnapshot: source.getSnapshot,
        subscribe: source.subscribe,
        set(next) {
          const normalized =
            next === "conversation" ? "conversation" : "workspace";
          if (source.getSnapshot() === normalized) return;
          try {
            localStorage.setItem(MODE_KEY, normalized);
          } catch (_unavailable) {
            // The setting still applies to this page when storage is unavailable.
          }
          source.set(normalized);
        },
      };
    }

    const modeSource = createModeSource();
    const statusSource = createSource({
      state: "waiting",
      sessionId: undefined,
    });
    /** Whether the frame currently shows its right column; undefined until known. */
    const rightbarShownSource = createSource(undefined);

    function rowStyle() {
      return [
        ".dws-setting-row{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:24px;padding:16px 0;display:flex}",
        ".dws-setting-title{font-size:14px;line-height:20px}",
        ".dws-setting-desc{color:var(--dsw-alias-label-secondary);margin-top:4px;font-size:12px;line-height:18px}",
        ".dws-setting-status{color:var(--dsw-alias-label-secondary);margin-top:6px;font-size:12px;line-height:18px}",
      ].join("\n");
    }

    function expandStyle() {
      return [
        ".dws-expand{width:28px;color:var(--dsw-alias-label-secondary);flex:none;padding:0}",
        ".dws-expand svg{width:15px;height:15px}",
        ".dws-expand-icon{transform:scaleX(-1)}",
      ].join("\n");
    }

    function WorkspaceSidebarSetting(props) {
      const useMode =
        typeof props.useMode === "function" ? props.useMode : () => "workspace";
      const useStatus =
        typeof props.useStatus === "function"
          ? props.useStatus
          : () => ({ state: "waiting" });
      const setMode =
        typeof props.setMode === "function" ? props.setMode : () => {};
      const t = typeof props.t === "function" ? props.t : (key) => key;
      const mode = useMode((value) => value);
      const status = useStatus((value) => value);
      const enabled = mode === "workspace";
      const chinese = /^zh/i.test(
        typeof navigator === "undefined" ? "" : navigator.language || "",
      );
      const rawTitle = t("setting.title");
      const rawDescription = t("setting.description");
      const title =
        rawTitle !== undefined &&
        rawTitle !== "" &&
        !String(rawTitle).startsWith("setting.")
          ? rawTitle
          : chinese
            ? "按工作区共享侧边栏"
            : "Share the sidebar per workspace";
      const description =
        rawDescription !== undefined &&
        rawDescription !== "" &&
        !String(rawDescription).startsWith("setting.")
          ? rawDescription
          : chinese
            ? "同一工作区里的对话共用一个会话的右侧栏标签与布局。"
            : "Conversations in the same workspace share one conversation’s right-sidebar tabs and layout.";
      const statusText = !enabled
        ? chinese
          ? "已关闭：每个对话各自保存"
          : "Off: each conversation keeps its own sidebar"
        : status !== undefined && status.state === "active"
          ? chinese
            ? "已生效：右侧栏跟随该工作区固定的承载会话"
            : "Active: the sidebar follows this workspace’s pinned conversation"
          : status !== undefined && status.state === "none"
            ? chinese
              ? "当前对话没有可共享的工作区会话"
              : "No shareable workspace conversation for this chat"
            : status !== undefined && status.state === "error"
              ? chinese
                ? "读取会话信息失败，未生效"
                : "Could not read the session state; not active"
              : chinese
                ? "正在初始化…"
                : "Starting…";

      const control =
        primitives !== undefined && typeof primitives.Switch === "function"
          ? h(primitives.Switch, {
              checked: enabled,
              label: title,
              onChange: (next) => setMode(next ? "workspace" : "conversation"),
            })
          : h(
              "button",
              {
                type: "button",
                "aria-pressed": enabled,
                onClick: () => setMode(enabled ? "conversation" : "workspace"),
              },
              enabled ? "On" : "Off",
            );

      return h(
        "div",
        { className: "dws-setting-row" },
        h("style", null, rowStyle()),
        h(
          "div",
          null,
          h("div", { className: "dws-setting-title" }, title),
          h("div", { className: "dws-setting-desc" }, description),
          h("div", { className: "dws-setting-status" }, statusText),
        ),
        control,
      );
    }

    function localized(t, key, zhText, enText) {
      let value;
      try {
        value = t(key);
      } catch (_unavailable) {
        value = undefined;
      }
      if (
        typeof value === "string" &&
        value !== "" &&
        value !== key &&
        !value.startsWith(`${key}.`)
      ) {
        return value;
      }
      return /^zh/i.test(
        typeof navigator === "undefined" ? "" : navigator.language || "",
      )
        ? zhText
        : enText;
    }

    /**
     * Replace the official per-session expand control. The official control reads
     * the active conversation's own layout, which is empty for every conversation
     * except the shared anchor. This control reads the frame's right-column state
     * and toggles whatever session the sidebar is actually mounted on, so every
     * conversation agrees.
     */
    function WorkspaceExpandButton(props) {
      const useShown =
        typeof props.useShown === "function"
          ? props.useShown
          : (select) => select(undefined);
      const useShortcuts =
        typeof props.useShortcuts === "function"
          ? props.useShortcuts
          : (select) => select([]);
      const shown = useShown((value) => value);
      const shortcut = useShortcuts((rows) =>
        Array.isArray(rows)
          ? rows.find((row) => row.id === "sidebar.right.toggle")
          : undefined,
      );
      const t = typeof props.t === "function" ? props.t : (key) => key;
      // Unknown presentation (first paint) keeps the corner quiet rather than
      // showing a control that could disagree with the column.
      if (shown !== false) return null;

      const label = localized(t, "chrome.expand", "展开右侧栏", "Expand right sidebar");
      const aria = localized(
        t,
        "chrome.expandAria",
        "展开右侧栏",
        "Expand the right sidebar",
      );
      const icon =
        primitives !== undefined &&
        typeof primitives.IconPanelLeftOutlineRegular === "function"
          ? h(primitives.IconPanelLeftOutlineRegular, {
              className: "dws-expand-icon",
            })
          : h("span", { "aria-hidden": true }, "\u2039");
      const button =
        primitives !== undefined && typeof primitives.Button === "function"
          ? h(
              primitives.Button,
              {
                size: "sm",
                className: "dws-expand",
                "aria-label": aria,
                "aria-keyshortcuts": shortcut?.aria,
                "data-sidebar-right-expand": true,
                onClick: () => {
                  if (typeof props.toggleShared === "function") {
                    props.toggleShared();
                  }
                },
              },
              icon,
            )
          : h(
              "button",
              {
                type: "button",
                className: "dws-expand",
                "aria-label": aria,
                "aria-keyshortcuts": shortcut?.aria,
                "data-sidebar-right-expand": true,
                onClick: () => {
                  if (typeof props.toggleShared === "function") {
                    props.toggleShared();
                  }
                },
              },
              icon,
            );
      const control =
        primitives !== undefined && typeof primitives.Tooltip === "function"
          ? h(
              primitives.Tooltip,
              {
                label,
                shortcutKeys: shortcut?.keys,
                side: "bottom",
                delayMs: 500,
              },
              button,
            )
          : button;
      return h(
        React.Fragment,
        null,
        h("style", { key: "style" }, expandStyle()),
        h(React.Fragment, { key: "control" }, control),
      );
    }

    /** The layout root's singleton store lets us observe the frame's columns. */
    function createStoreInstance(declaration) {
      if (declaration === undefined) return undefined;
      try {
        if (typeof declaration.create === "function") return declaration.create();
        if (typeof declaration === "function") return declaration();
      } catch (_unavailable) {
        return undefined;
      }
      return undefined;
    }

    function apply(ctx) {
      let localeRegistered = false;
      function registerLocale() {
        if (localeRegistered) return;
        const locale = ctx.get("locale");
        if (locale === undefined) return;
        localeRegistered = true;
        try {
          ctx.effect(
            () => locale.register(NS, { zh, en }),
            "workspace-sidebar: dictionaries",
          );
        } catch (error) {
          console.error("workspace-sidebar: locale registration failed", error);
        }
      }

      registerLocale();

      ctx.slots.inject("settings.general.item", () =>
        ctx.slots.register(
          {
            name: "settings.general.item",
            id: "workspace-sidebar",
            order: 25,
            locale: NS,
            inject: () => ({
              hooks: { mode: modeSource, status: statusSource },
              setMode: (next) => modeSource.set(next),
            }),
          },
          WorkspaceSidebarSetting,
        ),
      );

      let watching = false;
      let headerInstalled = false;

      function installWatch() {
        if (watching) return true;
        if (typeof ctx.slots.entries !== "function") return false;
        let instance;
        try {
          const root = ctx.slots
            .entries("root")
            .find((entry) => entry.store !== undefined);
          instance = createStoreInstance(root?.store);
        } catch (_unavailable) {
          instance = undefined;
        }
        if (
          instance === undefined ||
          typeof instance.getSnapshot !== "function" ||
          typeof instance.subscribe !== "function"
        ) {
          return false;
        }
        const read = () => {
          try {
            return instance.getSnapshot()?.layoutInfo?.rightbarShown === true;
          } catch (_unavailable) {
            return false;
          }
        };
        watching = true;
        rightbarShownSource.set(read());
        const stop = instance.subscribe(() =>
          rightbarShownSource.set(read()),
        );
        ctx.effect(
          () => stop,
          "workspace-sidebar: right column presentation",
        );
        return true;
      }

      function installHeader() {
        if (headerInstalled) return;
        headerInstalled = true;
        try {
          const injected = {
            toggleShared: () => {
              try {
                const rightbar = ctx.get("sidebarRight");
                if (
                  rightbar !== undefined &&
                  typeof rightbar.toggleExpanded === "function"
                ) {
                  rightbar.toggleExpanded();
                }
              } catch (error) {
                console.error(
                  "workspace-sidebar: shared sidebar toggle failed",
                  error,
                );
              }
            },
          };
          if (ctx.shortcuts !== undefined) {
            injected.hooks = {
              shown: rightbarShownSource,
              shortcuts: ctx.shortcuts.catalog,
            };
          } else {
            injected.hooks = { shown: rightbarShownSource };
          }
          ctx.slots.inject("conversation.session.header.corner", () => {
            try {
              return ctx.slots.register(
                {
                  name: "conversation.session.header.corner",
                  priority: -10,
                  locale: NS,
                  inject: () => injected,
                },
                WorkspaceExpandButton,
              );
            } catch (error) {
              console.error(
                "workspace-sidebar: header control registration failed",
                error,
              );
              return () => {};
            }
          });
        } catch (error) {
          console.error(
            "workspace-sidebar: header control setup failed",
            error,
          );
        }
      }

      let installed = false;
      function setup() {
        if (installed) return true;
        registerLocale();
        const uiSession = ctx.get("uiSession");
        const workspaces = ctx.get("workspaces");
        const sessions = ctx.get("sessions");
        if (
          uiSession === undefined ||
          workspaces === undefined ||
          sessions === undefined
        ) {
          return false;
        }
        if (typeof ctx.slots.entries === "function") {
          const rightbarEntries = ctx.slots.entries("rightbar");
          if (
            !rightbarEntries.some(
              (entry) =>
                (entry.options === undefined
                  ? 0
                  : (entry.options.priority ?? 0)) === 0,
            )
          ) {
            return false;
          }
        }

        const current = uiSession.adapter.current;
        if (
          current === undefined ||
          typeof current.getSnapshot !== "function" ||
          !(current.listeners instanceof Set)
        ) {
          console.error(
            "workspace-sidebar: the current-session source is not accessible",
          );
          statusSource.set({ state: "error", sessionId: undefined });
          installed = true;
          return true;
        }

        installed = true;

        const currentSessionId = () => {
          const value = current.getSnapshot();
          return value === undefined || value === null ? undefined : value.key;
        };

        const workspaceOf = (sessionId) => {
          if (sessionId === undefined) return undefined;
          const snapshot = workspaces.list.getSnapshot();
          for (const item of snapshot.items) {
            if (item.sessionIds.indexOf(sessionId) !== -1)
              return { item, snapshot };
          }
          return undefined;
        };

        /**
         * Pick and remember the conversation that owns this workspace's sidebar.
         *
         * The choice is pinned per workspace instead of recomputed from the list
         * order: sessions attach at the front, so a freshly created conversation
         * would otherwise become the owner and every other conversation's sidebar
         * would fall back to that blank session's default layout. Blank sessions
         * are never eligible. On first use the newest established conversation is
         * chosen, which preserves the layout an earlier version of the plugin was
         * already sharing; after that, only archiving or deleting the owner moves
         * the pin.
         */
        const anchorOf = (sessionId) => {
          const found = workspaceOf(sessionId);
          if (found === undefined) return undefined;
          const { item, snapshot } = found;
          const sessionState = sessions.list.getSnapshot();
          if (sessionState.phase !== "ready") return undefined;
          const archived = snapshot.archivedSessionIds ?? [];
          const eligible = (id) => {
            if (id === undefined || item.sessionIds.indexOf(id) === -1) {
              return false;
            }
            if (archived.indexOf(id) !== -1) return false;
            const row = sessionState.byId[id];
            return row !== undefined && row.blank !== true;
          };

          const anchors = readAnchors();
          const pinned = anchors[item.workspaceId];
          if (eligible(pinned)) return pinned;
          if (pinned !== undefined) writeAnchor(item.workspaceId, undefined);

          for (const id of item.sessionIds) {
            if (!eligible(id)) continue;
            writeAnchor(item.workspaceId, id);
            return id;
          }
          return undefined;
        };

        let pinning = false;
        function selectSidebarSession(sessionId) {
          if (sessionId === undefined || pinning) return;
          const original = current.getSnapshot;
          pinning = true;
          current.getSnapshot = function patchedSnapshot() {
            const value = original.call(current);
            if (
              value === undefined ||
              value === null ||
              value.key === sessionId
            )
              return value;
            return { ...value, key: sessionId };
          };
          try {
            for (const listener of Array.from(current.listeners)) {
              try {
                listener();
              } catch (error) {
                console.error(
                  "workspace-sidebar: sidebar session selection failed",
                  error,
                );
              }
            }
          } finally {
            current.getSnapshot = original;
            pinning = false;
          }
        }

        let lastSignature = "";
        function pin() {
          const mode = modeSource.getSnapshot();
          const actual = currentSessionId();
          if (mode !== "workspace") {
            const signature = `conversation:${actual ?? ""}`;
            if (signature === lastSignature) return;
            lastSignature = signature;
            if (actual !== undefined) selectSidebarSession(actual);
            statusSource.set({ state: "off", sessionId: undefined });
            return;
          }
          const phase = sessions.list.getSnapshot().phase;
          const anchor = actual === undefined ? undefined : anchorOf(actual);
          const signature = `workspace:${phase}:${actual ?? ""}:${anchor ?? ""}`;
          if (signature === lastSignature) return;
          lastSignature = signature;
          if (anchor === undefined) {
            statusSource.set({
              state: phase === "ready" ? "none" : "waiting",
              sessionId: undefined,
            });
            return;
          }
          selectSidebarSession(anchor);
          statusSource.set({ state: "active", sessionId: anchor });
        }

        const stopCurrent = current.subscribe(pin);
        const stopWorkspaces = workspaces.list.subscribe(pin);
        const stopSessions = sessions.list.subscribe(pin);
        const stopMode = modeSource.subscribe(pin);
        ctx.effect(
          () => () => {
            stopCurrent();
            stopWorkspaces();
            stopSessions();
            stopMode();
          },
          "workspace-sidebar: workspace pin",
        );

        if (installWatch()) {
          installHeader();
        } else {
          // The layout root is normally available alongside the rightbar seat,
          // but never let a missing observer disable the sharing behaviour.
          let watchAttempts = 0;
          const watchTimer = setInterval(() => {
            watchAttempts += 1;
            try {
              if (installWatch()) {
                clearInterval(watchTimer);
                installHeader();
              } else if (watchAttempts > 100) {
                clearInterval(watchTimer);
              }
            } catch (error) {
              clearInterval(watchTimer);
              console.error("workspace-sidebar: header setup failed", error);
            }
          }, 100);
          ctx.effect(
            () => () => clearInterval(watchTimer),
            "workspace-sidebar: header wait",
          );
        }
        pin();
        return true;
      }

      try {
        if (!setup()) {
          let attempts = 0;
          const timer = setInterval(() => {
            attempts += 1;
            try {
              if (setup() || attempts > 100) clearInterval(timer);
            } catch (error) {
              clearInterval(timer);
              console.error("workspace-sidebar: setup failed", error);
            }
          }, 100);
          ctx.effect(
            () => () => clearInterval(timer),
            "workspace-sidebar: setup wait",
          );
        }
      } catch (error) {
        // Never let this optional preference take the whole client roster down.
        console.error("workspace-sidebar: setup failed", error);
      }
    }

    return {
      inject: ["slots"],
      apply,
    };
  },
});
