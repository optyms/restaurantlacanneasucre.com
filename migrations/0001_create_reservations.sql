-- Schema de la table reservations pour le systeme de reservation La Canne a Sucre
CREATE TABLE IF NOT EXISTS reservations (
  id          TEXT    PRIMARY KEY,
  first_name  TEXT    NOT NULL,
  last_name   TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  date        TEXT    NOT NULL,
  time_slot   TEXT    NOT NULL,
  party_size  INTEGER NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
