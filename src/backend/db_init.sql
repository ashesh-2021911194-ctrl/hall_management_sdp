-- DB initialization SQL for authority and staff tables

-- Authority table (as provided by user)
CREATE TABLE IF NOT EXISTS public.authority
(
    authority_id integer NOT NULL DEFAULT nextval('authority_authority_id_seq'::regclass),
    username text COLLATE pg_catalog."default" NOT NULL,
    password text COLLATE pg_catalog."default" NOT NULL,
    name text COLLATE pg_catalog."default",
    CONSTRAINT authority_pkey PRIMARY KEY (authority_id),
    CONSTRAINT authority_username_key UNIQUE (username)
);

-- Staff table used by authority routes
CREATE TABLE IF NOT EXISTS public.staff
(
    staff_id serial PRIMARY KEY,
    name text NOT NULL,
    designation text NOT NULL,
    email text,
    phone text,
    department text,
    image_url text,
    created_by integer REFERENCES public.authority(authority_id),
    created_at timestamp with time zone DEFAULT now()
);

-- Optional index on created_at for faster ordering
CREATE INDEX IF NOT EXISTS idx_staff_created_at ON public.staff (created_at DESC);
