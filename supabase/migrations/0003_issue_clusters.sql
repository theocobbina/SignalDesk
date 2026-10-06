-- Emerging issues: groups of similar reports from the same building in a short time window
-- (e.g. 4 "no hot water" reports in Block B → likely a boiler failure).

create type cluster_status as enum ('active', 'resolved', 'dismissed');

create table issue_clusters (
  id              bigserial primary key,
  building_id     int references buildings(id),
  category_slug   text references categories(slug),
  title           text not null,          -- taken from the first report
  status          cluster_status not null default 'active',
  request_count   int not null default 0,
  max_priority    smallint,
  centroid        vector(384),            -- mean embedding of member requests
  first_seen      timestamptz not null,
  last_seen       timestamptz not null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);

create index issue_clusters_active_idx on issue_clusters(status, building_id, last_seen desc);

alter table requests add column cluster_id bigint references issue_clusters(id) on delete set null;
create index requests_cluster_idx on requests(cluster_id);

alter table issue_clusters enable row level security;
