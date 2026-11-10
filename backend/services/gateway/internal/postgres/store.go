package postgres

import (
	"github.com/jackc/pgx/v5/pgxpool"
)

const Schema = "gateway"

type Store struct{}

func New(pool *pgxpool.Pool) *Store {
	return &Store{}
}
