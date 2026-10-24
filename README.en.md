# dsh-workspace-sidebar

[中文](README.md) | English

Makes the **right sidebar** of the DSH Web GUI shared per workspace: every conversation in the same workspace uses the same right-sidebar tabs and layout, so switching to another conversation in that workspace no longer swaps the sidebar contents.

## Features

- Adds a **Share the sidebar per workspace** switch under **Settings → General**. It is **on** by default, and a status line below it shows the current state (for example, “Active: the sidebar follows this workspace's pinned conversation”).
- After collapsing the sidebar, the conversation header's corner shows an **Expand sidebar** control with its shortcut hint, matching the official behaviour.
- Workspace mode: each workspace **pins** one owning conversation (on first use, the newest non-blank conversation at that moment; it then stops following list changes), and every conversation in the workspace shares that sidebar: open tabs, active tab, split panes, floating panels, expanded state, and so on.
- **New Session** neither empties the shared sidebar nor changes its owner, and that stays true after the blank conversation sends its first message.
- Conversation mode: turn the switch off to restore DSH's built-in per-conversation behaviour.
- Workspace switching: moving to a different workspace switches the sidebar to the layout of that workspace's pinned conversation.
- If the owning conversation is archived or deleted, the plugin automatically falls through to the next available conversation and pins it.
- Conversations without a workspace (Ungrouped) have no sharing scope and keep following the current conversation.

## Installation

```powershell
dsh plugin --profile web add dsh-workspace-sidebar
```

Alternatively, install it from a local directory in the Web GUI under **Settings → Plugins**. After installing, refresh the page; the switch appears under **Settings → General**.

## How it works

- It does **not** replace or modify the official `rightbar` slot of `ui-sidebar-right`, and it does not fork the official package, so upstream updates can be installed normally.
- The plugin does three things:
  1. Registers one row in **Settings → General**.
  2. When the conversation or workspace changes, makes the official right sidebar select the workspace's **pinned owner**: on first use it chooses the newest non-blank conversation and remembers it, then never follows newly created sessions. It temporarily maps the current session source to that conversation, notifies the official `SidebarSessionViews` to re-select, then restores the source immediately. The official sidebar's root component, tabs, persistence, and navigation stay untouched.
  3. Replaces the **expand right sidebar** control in the conversation header's corner (that single slot only). The official control reads the *current conversation's own* layout, so it shows the wrong state in every conversation except the owner, and its click only changes that conversation. The replacement reads the frame's actual right-column state and toggles the session the sidebar is really showing through the official `sidebarRight` controller.
- The switch state and each workspace's pinned owner live in the browser's `localStorage` (`dsh.workspace-sidebar.v1.mode`, `dsh.workspace-sidebar.v1.anchors`).

## Verification

- After a refresh, open **Settings → General**; the **Share the sidebar per workspace** row and its status line are visible.
- The status line reads “Active: the sidebar follows this workspace's pinned conversation”.
- Open the right sidebar, switch to another conversation in the same workspace, and the sidebar tabs and layout stay the same.
- Click **New Session** in the same workspace: the sidebar stays as it was; clicking the header's expand control opens the shared sidebar rather than a blank default layout.
- Turn the switch off, switch conversations again, and the sidebar goes back to being saved per conversation.

## Limitations

- The sidebar layout is still stored in the browser's `localStorage`; it does not sync across devices.
- In workspace mode, **conversation-content** tabs in the sidebar (for example, the “Chat” tab) are bound to the workspace's pinned conversation, not to the conversation you are currently viewing. Files, document previews, terminals, and other content rooted at the workspace directory are unaffected.
- The owner is pinned on first use; creating conversations or dragging their order does not change it. Only archiving or deleting the owner advances the pin.
- Conversations without a workspace have no sharing scope.

## License

MIT
