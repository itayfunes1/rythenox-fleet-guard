## Messages — Phase 2

Adds three feature bundles on top of the existing channel/DM/mention/typing system.

### 1. Reactions, edit/delete, pins

- New table `chat_message_reactions(message_id, user_id, tenant_id, emoji, created_at)` with unique `(message_id, user_id, emoji)`. RLS: insert/delete own; select if channel member (via `chat_messages -> is_chat_channel_member`).
- Extend `chat_messages` with `deleted_at timestamptz` (soft delete) and `pinned_at timestamptz`. Existing `edited_at` already present — on UPDATE trigger, set `edited_at = now()` when `body` changes.
- RLS already allows author edit and author/admin delete. Add policy/trigger so pinning requires tenant admin only.
- UI per message: hover row reveals emoji picker, reply-in-thread, edit (own), delete (own/admin), pin (admin). Reactions render as compact chips with counts; click toggles your reaction. Deleted messages show a muted "message deleted" placeholder. Edited messages show an "edited" tag with tooltip timestamp.
- New "Pinned" panel in the channel header: popover listing pinned messages, click to scroll to message.

### 2. Threaded replies + message search

- Extend `chat_messages` with `parent_id uuid` (nullable, references chat_messages.id) and `reply_count int default 0`. Trigger maintains `reply_count` on the parent on insert/soft-delete.
- Top-level message list filters `parent_id IS NULL`. Each message shows "N replies · last reply Xm ago" when `reply_count > 0`.
- Right-side Thread panel opens when a message is selected: header shows the parent, list of replies, composer that posts with `parent_id` set. Same mention/typing/reactions logic reused.
- Full-text search: add `tsvector` generated column `body_tsv` on `chat_messages` plus GIN index. New page section/sheet "Search" with input → uses `to_tsquery` via an RPC `search_chat_messages(_query text, _channel_id uuid default null)` that returns matches in channels you can see (RLS via `is_chat_channel_member` check inside RPC). Results show channel, author email, snippet, timestamp; click jumps to channel + scroll-to-message.

### 3. File & image attachments

- New public-ish bucket `chat-attachments` (private; access via signed URLs). Path convention: `{tenant_id}/{channel_id}/{message_id}/{filename}`.
- Storage RLS: insert allowed if `tenant_id` prefix matches `get_user_tenant_id(auth.uid())` AND user is member of `channel_id`. Select allowed via signed URL only (no public read).
- New table `chat_message_attachments(id, message_id, tenant_id, channel_id, storage_path, mime_type, byte_size, width, height, created_at)`. RLS mirrors `chat_messages` visibility.
- Composer: paperclip + drag-drop. Client uploads to storage, then inserts the message with attachments rows in the same mutation. 25 MB per file, max 5 per message. Image MIME types render inline thumbnails (lazy-loaded signed URL); other types render as a file card with name, size, download.
- Image lightbox: click thumbnail to open full-size signed URL in a Dialog.

### Frontend changes

- `src/hooks/use-chat.ts` — extend `ChatMessage` type, add hooks: `useToggleReaction`, `useEditMessage`, `useDeleteMessage`, `useTogglePin`, `usePinnedMessages`, `useThreadReplies`, `useSearchMessages`, `useUploadAttachment`. Keep existing realtime subscriptions; add channels for `chat_message_reactions` and `chat_message_attachments` filtered by channel.
- `src/pages/Messages.tsx` — extract a `MessageRow` component (file-scope, not nested) with hover actions, reactions strip, attachments, edit-in-place. Add `ThreadPanel`, `PinnedPopover`, `SearchSheet`, `AttachmentPicker`. Slash-/key shortcuts unchanged.
- Reuse design tokens; no dark mode.

### Technical notes

- Migrations in one file: new tables, new columns, indexes (`idx_chat_messages_channel_parent_created`, GIN on `body_tsv`), triggers (`bump_edited_at`, `maintain_reply_count`), RPCs (`search_chat_messages`, `pin_message`, `unpin_message`).
- Notification fan-out: extend `notify_chat_mentions` to also fire for thread replies (notify parent author when someone replies, gated by a new `thread_replies` column on `notification_preferences`).
- All new tables: `tenant_id` column populated server-side via trigger from the parent message/channel to keep RLS simple.
- Attachments UI uses `createSignedUrl(path, 60*60)` cached in React Query keyed by storage_path.

### Out of scope (next phases)

- Slash commands, link unfurls, per-channel mute, channel rename/archive, full audit-log surface for chat actions.
