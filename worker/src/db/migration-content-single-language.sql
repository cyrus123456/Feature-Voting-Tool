-- Migration: collapse bilingual content into a single title + description.
-- Keeps existing English content (title_en -> title, desc_en -> description),
-- drops the Vietnamese columns. Reruns / fresh-DB runs fail on the first
-- RENAME with "no such column: title_en" and are tolerated by CI.

ALTER TABLE features RENAME COLUMN title_en TO title;
ALTER TABLE features RENAME COLUMN desc_en TO description;
ALTER TABLE features DROP COLUMN title_vi;
ALTER TABLE features DROP COLUMN desc_vi;

ALTER TABLE feature_suggestions RENAME COLUMN title_en TO title;
ALTER TABLE feature_suggestions RENAME COLUMN desc_en TO description;
ALTER TABLE feature_suggestions DROP COLUMN title_vi;
ALTER TABLE feature_suggestions DROP COLUMN desc_vi;
