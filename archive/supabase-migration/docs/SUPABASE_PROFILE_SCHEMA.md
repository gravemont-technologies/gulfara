# Supabase Profile Schema

This document captures the canonical structure of the `profiles` table and the default learner state that Gulfara expects when a user signs in via Clerk.

## Table Definition

```sql
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  clerk_user_id text unique not null,
  name text not null,
  email text not null,
  avatar_url text,
  gender text check (gender in ('male', 'female', 'other')),
  age_range text check (age_range in ('18-25', '26-35', '36-45', '46-55', '55+')),
  occupation text,
  learning_goals text[],
  difficulty_level text check (difficulty_level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  preferred_categories text[],
  total_points integer default 0,
  level integer default 1,
  streak integer default 0,
  total_study_time integer default 0,
  average_accuracy numeric(5,2) default 0,
  coins integer default 1000,
  onboarding_completed boolean default false,
  onboarding_data jsonb,
  preferences jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Default Values

| Column                | Default | Notes                                                  |
|-----------------------|---------|--------------------------------------------------------|
| `coins`               | 1000    | Starting coin balance for every new learner            |
| `total_points`        | 0       | Aggregate points earned from practice sessions         |
| `level`               | 1       | Learner level; evolves with future gamification rules  |
| `streak`              | 0       | Daily streak counter                                   |
| `total_study_time`    | 0       | Minutes spent practicing                               |
| `average_accuracy`    | 0.0     | Running average of performance                         |
| `onboarding_completed`| false   | Guard to ensure onboarding form runs at first sign-in  |
| `onboarding_data`     | null    | Raw JSON payload captured from onboarding quiz         |
| `preferences`         | null    | Derived preferences (categories, difficulty, goals)    |

### Prefetched Deck Storage

When adaptive decks are generated, they are persisted to `public.user_decks`:

```sql
create table public.user_decks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  seed_id text,
  deck jsonb not null,
  categories text[] not null,
  difficulty_level text,
  generated_at timestamptz default now()
);

create index idx_user_decks_user_id on public.user_decks(user_id);
```

Each `deck` JSON contains the prepared flashcards for a learner’s next session, allowing practice to start without additional AI calls.

## Automatic Provisioning

`useEnsureProfile` (located at `src/hooks/useEnsureProfile.ts`) executes whenever a signed-in user enters a protected route. It:

1. Looks up the Supabase row by `clerk_user_id`.
2. Inserts a profile with the defaults above if no record exists.
3. Merges any missing values (e.g., coins, streak) on subsequent loads to guard against schema migrations.

## Updating Onboarding Data

`src/pages/Onboarding.tsx` persists the quiz responses with:

```ts
await supabase.from('profiles').update({
  name,
  gender,
  age_range,
  occupation,
  learning_goals,
  difficulty_level,
  preferred_categories,
  onboarding_completed: true,
  onboarding_data: data,
  preferences: {
    categories,
    difficultyLevel,
    learningGoal,
  },
}).eq('id', profile.id);
```

These fields power AI deck prefetching, category filtering, and future analytics.

## Seed Fixture

```sql
insert into public.profiles (
  clerk_user_id, name, email, coins, onboarding_completed, onboarding_data, preferences
) values (
  'test_clerk_user',
  'Test Learner',
  'learner@example.com',
  1000,
  true,
  '{"name":"Test Learner","difficultyLevel":"A1","categories":["family","work"]}',
  '{"categories":["family","work"],"difficultyLevel":"A1","learningGoal":["work"]}'
);
```

Use this seed in staging environments to validate the adaptive flow without running onboarding manually.

