-- ============================================
-- 语文词汇相关表（独立于英语词库，cn_ 前缀）
-- ============================================

-- 1. cn_grades 表（语文学年）
create table cn_grades (
  id bigint generated always as identity primary key,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 2. cn_units 表（语文单元）
create table cn_units (
  id bigint generated always as identity primary key,
  grade_id bigint not null references cn_grades(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 3. cn_words 表（语文词汇，只需 word 字段）
create table cn_words (
  id bigint generated always as identity primary key,
  unit_id bigint not null references cn_units(id) on delete cascade,
  word text not null,
  created_at timestamptz default now()
);

-- 4. cn_wrong_words 表（语文错题本）
create table cn_wrong_words (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null references cn_words(id) on delete cascade,
  wrong_count int default 1,
  correct_streak int default 0,
  importance int default 1 check (importance between 1 and 3),
  mastered boolean default false,
  last_wrong_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, word_id)
);

-- importance 自动计算触发器
create or replace function update_cn_wrong_word_importance()
returns trigger
language plpgsql
set search_path = public
as $$
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
$$;

create trigger cn_wrong_word_importance_trigger
  before insert or update of wrong_count, correct_streak on cn_wrong_words
  for each row execute function update_cn_wrong_word_importance();

-- 5. cn_dictation_records 表（默写记录）
create table cn_dictation_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null references cn_words(id) on delete cascade,
  is_correct boolean not null,
  created_at timestamptz default now()
);

-- ============================================
-- 索引
-- ============================================
create index idx_cn_units_grade_id on cn_units(grade_id);
create index idx_cn_words_unit_id on cn_words(unit_id);
create index idx_cn_wrong_words_user_id on cn_wrong_words(user_id);
create index idx_cn_wrong_words_importance on cn_wrong_words(importance);
create index idx_cn_dictation_records_user_id on cn_dictation_records(user_id);
create index idx_cn_dictation_records_created_at on cn_dictation_records(created_at);

-- ============================================
-- Row Level Security
-- ============================================
alter table cn_grades enable row level security;
alter table cn_units enable row level security;
alter table cn_words enable row level security;
alter table cn_wrong_words enable row level security;
alter table cn_dictation_records enable row level security;

-- cn_grades/cn_units/cn_words: 所有已登录用户可读
create policy "cn_grades_select" on cn_grades for select to authenticated using (true);
create policy "cn_units_select" on cn_units for select to authenticated using (true);
create policy "cn_words_select" on cn_words for select to authenticated using (true);

-- cn_wrong_words: 只能操作自己的
create policy "cn_wrong_words_select" on cn_wrong_words for select using (auth.uid() = user_id);
create policy "cn_wrong_words_insert" on cn_wrong_words for insert with check (auth.uid() = user_id);
create policy "cn_wrong_words_update" on cn_wrong_words for update using (auth.uid() = user_id);
create policy "cn_wrong_words_delete" on cn_wrong_words for delete using (auth.uid() = user_id);

-- cn_dictation_records: 只能操作自己的
create policy "cn_dictation_records_select" on cn_dictation_records for select using (auth.uid() = user_id);
create policy "cn_dictation_records_insert" on cn_dictation_records for insert with check (auth.uid() = user_id);
