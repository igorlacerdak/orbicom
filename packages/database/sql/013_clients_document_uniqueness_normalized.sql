drop index if exists public.uq_clients_workspace_document;

create unique index if not exists uq_clients_workspace_document_normalized
on public.clients (
  workspace_id,
  regexp_replace(document, '\\D', '', 'g')
);
