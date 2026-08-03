-- Extensions required by the WMS application.
--
-- Runs once, on the container's first boot, against POSTGRES_DB (see
-- docker-compose.yml's `db` service). PostGIS itself is already compiled
-- into the postgis/postgis image; this just turns it on for this database.
--
-- uuid-ossp : uuid_generate_v4() for entity ids that shouldn't leak
--             creation order (unlike a serial/bigserial primary key).
-- pgcrypto  : gen_random_uuid() and password/token hashing helpers.
-- postgis   : geographic/geometric types and operators, for Routing's
--             warehouse and delivery-stop coordinates.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
