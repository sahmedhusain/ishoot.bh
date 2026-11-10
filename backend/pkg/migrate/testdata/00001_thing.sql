-- +goose Up
CREATE TABLE IF NOT EXISTS sample.thing (id int PRIMARY KEY);

-- +goose Down
DROP TABLE sample.thing;
