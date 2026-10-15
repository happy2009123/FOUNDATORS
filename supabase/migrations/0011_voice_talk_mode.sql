-- 0011: voice room talk modes.
--
-- 'host' - only the host and people the host explicitly allows can talk
--          (exactly how every existing room behaves today, so the column
--          default preserves old rooms).
-- 'open' - everyone who joins can use their mic immediately (joiners get
--          the speaker role, capped at max_speakers).
alter table public.voice_sessions
  add column if not exists talk_mode text not null default 'host';
