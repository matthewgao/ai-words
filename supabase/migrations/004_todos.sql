-- ============================================
-- TODO 功能相关表
-- ============================================

-- 1. todos 表
create table todos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  start_date date,
  due_date date,
  priority int default 2 check (priority between 1 and 3),
  is_recurring boolean default false,
  recurrence_days int check (recurrence_days >= 1),
  completed boolean default false,
  completed_at timestamptz,
  recurring_group_id uuid,
  created_at timestamptz default now()
);

-- 2. todo_tags 表（用户自定义标签）
create table todo_tags (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz default now(),
  unique(user_id, name)
);

-- 3. todo_tag_map 表（多对多关联）
create table todo_tag_map (
  todo_id bigint not null references todos(id) on delete cascade,
  tag_id bigint not null references todo_tags(id) on delete cascade,
  primary key (todo_id, tag_id)
);

-- ============================================
-- 索引
-- ============================================
create index idx_todos_user_due on todos(user_id, due_date);
create index idx_todos_user_completed on todos(user_id, completed);
create index idx_todos_completed_at on todos(completed_at);
create index idx_todos_recurring_group on todos(recurring_group_id);
create index idx_todo_tags_user on todo_tags(user_id);

-- ============================================
-- Row Level Security
-- ============================================
alter table todos enable row level security;
alter table todo_tags enable row level security;
alter table todo_tag_map enable row level security;

-- todos: 只能操作自己的
create policy "todos_select" on todos for select using (auth.uid() = user_id);
create policy "todos_insert" on todos for insert with check (auth.uid() = user_id);
create policy "todos_update" on todos for update using (auth.uid() = user_id);
create policy "todos_delete" on todos for delete using (auth.uid() = user_id);

-- todo_tags: 只能操作自己的
create policy "todo_tags_select" on todo_tags for select using (auth.uid() = user_id);
create policy "todo_tags_insert" on todo_tags for insert with check (auth.uid() = user_id);
create policy "todo_tags_update" on todo_tags for update using (auth.uid() = user_id);
create policy "todo_tags_delete" on todo_tags for delete using (auth.uid() = user_id);

-- todo_tag_map: 通过 todo 所有权控制
create policy "todo_tag_map_select" on todo_tag_map for select
  using (exists (select 1 from todos where todos.id = todo_tag_map.todo_id and todos.user_id = auth.uid()));
create policy "todo_tag_map_insert" on todo_tag_map for insert
  with check (exists (select 1 from todos where todos.id = todo_tag_map.todo_id and todos.user_id = auth.uid()));
create policy "todo_tag_map_delete" on todo_tag_map for delete
  using (exists (select 1 from todos where todos.id = todo_tag_map.todo_id and todos.user_id = auth.uid()));
