# dsh-workspace-sidebar

[中文](README.md) | English

Makes the **right sidebar** of the DSH Web GUI shared per workspace: every conversation in the same workspace uses the same right-sidebar tabs and layout, so switching to another conversation in that workspace no longer swaps the sidebar contents.

## Features

- Adds a **Share the sidebar per workspace** switch under **Settings → General**. It is **on** by default, and a status line below it shows the current state (for example, “Active: the sidebar follows this workspace's first conversation”).
- Workspace mode: each workspace uses its **first conversation** (the first item in the workspace's conversation list, skipping archived items) as the conversation that owns the right sidebar. Every conversation in the workspace shares that sidebar: open tabs, active tab, split panes, floating panels, expanded state, and so on.
- Conversation mode: turn the switch off to restore DSH's built-in per-conversation behaviour.
- Workspace switching: moving to a different workspace switches the sidebar to the layout of that workspace's first conversation.
- If the first conversation is archived or deleted, the plugin automatically falls through to the next available conversation.
- Conversations without a workspace (Ungrouped) have no sharing scope and keep following the current conversation.

## Installation

```powershell
dsh plugin --profile web add dsh-workspace-sidebar
```

Alternatively, install it from a local directory in the Web GUI under **Settings → Plugins**. After installing, refresh the page; the switch appears under **Settings → General**.

## How it works

- It does **not** replace or modify the official `rightbar` slot of `ui-sidebar-right`, and it does not fork the official package, so upstream updates can be installed normally.
- The plugin does only two things:
  1. Registers one row in **Settings → General**.
  2. When the conversation or workspace changes, makes the official right sidebar select the workspace's first conversation: it temporarily maps the current session source to that first conversation, notifies the official `SidebarSessionViews` to re-select, then restores the source immediately. The official sidebar's root component, tabs, persistence, and navigation stay untouched.
- The switch state is stored in the browser's `localStorage` under `dsh.workspace-sidebar.v1.mode`.

## Verification

- After a refresh, open **Settings → General**; the **Share the sidebar per workspace** row and its status line are visible.
- The status line reads “Active: the sidebar follows this workspace's first conversation”.
- Open the right sidebar, switch to another conversation in the same workspace, and the sidebar tabs and layout stay the same.
- Turn the switch off, switch conversations again, and the sidebar goes back to being saved per conversation.

## Limitations

- The sidebar layout is still stored in the browser's `localStorage`; it does not sync across devices.
- In workspace mode, **conversation-content** tabs in the sidebar (for example, the “Chat” tab) are bound to the workspace's first conversation, not to the conversation you are currently viewing. Files, document previews, terminals, and other content rooted at the workspace directory are unaffected.
- The first conversation is determined by the order of the workspace list; dragging conversations around in the sidebar changes which conversation owns the shared layout.
- Conversations without a workspace have no sharing scope.

## License

MIT
