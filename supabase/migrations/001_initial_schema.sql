-- ============================================
-- ai-words 初始数据库 Schema
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ============================================

-- 1. profiles 表（扩展 auth.users）
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- 新用户注册时自动创建 profile（第一个用户自动成为 admin）
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'user' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. grades 表（学年）
create table grades (
  id bigint generated always as identity primary key,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 3. units 表（单元）
create table units (
  id bigint generated always as identity primary key,
  grade_id bigint not null references grades(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 4. words 表（共享词库）
create table words (
  id bigint generated always as identity primary key,
  unit_id bigint not null references units(id) on delete cascade,
  word text not null,
  phonetic text,
  definition text not null,
  created_at timestamptz default now()
);

-- 5. quiz_records 表（背诵记录）
create table quiz_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null references words(id) on delete cascade,
  quiz_type text not null check (quiz_type in ('cn_to_en', 'listen_write', 'flashcard')),
  is_correct boolean not null,
  created_at timestamptz default now()
);

-- 6. wrong_words 表（错题本）
create table wrong_words (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null references words(id) on delete cascade,
  wrong_count int default 1,
  correct_streak int default 0,
  importance int default 1 check (importance between 1 and 3),
  mastered boolean default false,
  last_wrong_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, word_id)
);

-- importance 自动计算触发器
create or replace function update_wrong_word_importance()
returns trigger as $$
begin
  new.importance := case
    when new.wrong_count >= 6 then 3
    when new.wrong_count >= 3 then 2
    else 1
  end;
  if new.correct_streak >= 3 then
    new.mastered := true;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger wrong_word_importance_trigger
  before insert or update of wrong_count, correct_streak on wrong_words
  for each row execute function update_wrong_word_importance();

-- 7. user_word_lists 表（用户私有词表）
create table user_word_lists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table user_word_list_items (
  id bigint generated always as identity primary key,
  list_id bigint not null references user_word_lists(id) on delete cascade,
  word_id bigint not null references words(id) on delete cascade,
  unique(list_id, word_id)
);

-- ============================================
-- 索引
-- ============================================
create index idx_units_grade_id on units(grade_id);
create index idx_words_unit_id on words(unit_id);
create index idx_quiz_records_user_id on quiz_records(user_id);
create index idx_quiz_records_word_id on quiz_records(word_id);
create index idx_quiz_records_created_at on quiz_records(created_at);
create index idx_wrong_words_user_id on wrong_words(user_id);
create index idx_wrong_words_importance on wrong_words(importance);
create index idx_user_word_lists_user_id on user_word_lists(user_id);

-- ============================================
-- Row Level Security
-- ============================================
alter table profiles enable row level security;
alter table grades enable row level security;
alter table units enable row level security;
alter table words enable row level security;
alter table quiz_records enable row level security;
alter table wrong_words enable row level security;
alter table user_word_lists enable row level security;
alter table user_word_list_items enable row level security;

-- profiles: 所有人可读，只能改自己
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- grades/units/words: 所有已登录用户可读（写操作由后端 service_role 绕过 RLS）
create policy "grades_select" on grades for select to authenticated using (true);
create policy "units_select" on units for select to authenticated using (true);
create policy "words_select" on words for select to authenticated using (true);

-- quiz_records: 只能操作自己的
create policy "quiz_records_select" on quiz_records for select using (auth.uid() = user_id);
create policy "quiz_records_insert" on quiz_records for insert with check (auth.uid() = user_id);

-- wrong_words: 只能操作自己的
create policy "wrong_words_select" on wrong_words for select using (auth.uid() = user_id);
create policy "wrong_words_insert" on wrong_words for insert with check (auth.uid() = user_id);
create policy "wrong_words_update" on wrong_words for update using (auth.uid() = user_id);
create policy "wrong_words_delete" on wrong_words for delete using (auth.uid() = user_id);

-- user_word_lists: 只能操作自己的
create policy "user_word_lists_select" on user_word_lists for select using (auth.uid() = user_id);
create policy "user_word_lists_insert" on user_word_lists for insert with check (auth.uid() = user_id);
create policy "user_word_lists_update" on user_word_lists for update using (auth.uid() = user_id);
create policy "user_word_lists_delete" on user_word_lists for delete using (auth.uid() = user_id);

-- user_word_list_items: 通过 list 所有者控制
create policy "user_word_list_items_select" on user_word_list_items for select
  using (list_id in (select id from user_word_lists where user_id = auth.uid()));
create policy "user_word_list_items_insert" on user_word_list_items for insert
  with check (list_id in (select id from user_word_lists where user_id = auth.uid()));
create policy "user_word_list_items_delete" on user_word_list_items for delete
  using (list_id in (select id from user_word_lists where user_id = auth.uid()));
