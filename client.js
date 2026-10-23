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

    const zh = {
      "setting.title": "按工作区共享侧边栏",
      "setting.description":
        "同一工作区里的对话共用一个会话的右侧栏标签与布局。",
    };
    const en = {
      "setting.title": "Share the sidebar per workspace",
      "setting.description":
        "Conversations in the same workspace share one conversation’s right-sidebar tabs and layout.",
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

    function createModeSource() {
      let value = readMode();
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
          const normalized =
            next === "conversation" ? "conversation" : "workspace";
          if (value === normalized) return;
          value = normalized;
          try {
            localStorage.setItem(MODE_KEY, normalized);
          } catch (_unavailable) {
            // The setting still applies to this page when storage is unavailable.
          }
          for (const listener of listeners) listener();
        },
      };
    }

    const modeSource = createModeSource();

    function createStatusSource() {
      let value = { state: "waiting", sessionId: undefined };
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
          value = next;
          for (const listener of listeners) listener();
        },
      };
    }

    const statusSource = createStatusSource();

    function rowStyle() {
      return [
        ".dws-setting-row{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:24px;padding:16px 0;display:flex}",
        ".dws-setting-title{font-size:14px;line-height:20px}",
        ".dws-setting-desc{color:var(--dsw-alias-label-secondary);margin-top:4px;font-size:12px;line-height:18px}",
        ".dws-setting-status{color:var(--dsw-alias-label-secondary);margin-top:6px;font-size:12px;line-height:18px}",
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
            ? "已生效：右侧栏跟随该工作区的第一个会话"
            : "Active: the sidebar follows this workspace’s first conversation"
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

        const firstSessionOf = (sessionId) => {
          const found = workspaceOf(sessionId);
          if (found === undefined) return undefined;
          const { item, snapshot } = found;
          const sessionState = sessions.list.getSnapshot();
          const archived = snapshot.archivedSessionIds;
          for (const id of item.sessionIds) {
            if (archived.indexOf(id) !== -1) continue;
            if (
              sessionState.phase === "ready" &&
              sessionState.byId[id] === undefined
            )
              continue;
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

        function pin() {
          if (modeSource.getSnapshot() !== "workspace") {
            statusSource.set({ state: "off", sessionId: undefined });
            return;
          }
          const actual = currentSessionId();
          if (actual === undefined) {
            statusSource.set({ state: "none", sessionId: undefined });
            return;
          }
          const first = firstSessionOf(actual);
          if (first === undefined) {
            statusSource.set({ state: "none", sessionId: undefined });
            return;
          }
          if (first !== actual) selectSidebarSession(first);
          statusSource.set({ state: "active", sessionId: first });
        }

        const stopCurrent = current.subscribe(pin);
        const stopWorkspaces = workspaces.list.subscribe(pin);
        const stopMode = modeSource.subscribe(() => {
          if (modeSource.getSnapshot() === "workspace") {
            pin();
          } else {
            const actual = currentSessionId();
            if (actual !== undefined) selectSidebarSession(actual);
            statusSource.set({ state: "off", sessionId: undefined });
          }
        });
        ctx.effect(
          () => () => {
            stopCurrent();
            stopWorkspaces();
            stopMode();
          },
          "workspace-sidebar: workspace pin",
        );

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
