package password

import (
	"testing"
)

func TestVerifyDefaultPassword(t *testing.T) {
	// Argon2id hash from build-all-sql-seeds.cjs and seed files
	hash := "$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU"
	password := "Admin12345678!"

	// Default config
	cfg := Config{
		Memory:         19456,
		Iterations:     2,
		Parallelism:    1,
		MaxMemory:      262144,
		MaxIterations:  10,
		MaxParallelism: 16,
		MaxBcryptCost:  16,
	}
	hasher, err := New(cfg)
	if err != nil {
		t.Fatalf("Failed to create hasher: %v", err)
	}

	rehash, err := hasher.Verify(password, hash)
	if err != nil {
		t.Fatalf("Verify failed for password '%s' against seed hash: %v", password, err)
	}
	t.Logf("Password '%s' matches seed hash successfully! (rehash needed: %v)", password, rehash)
}

func TestGenerateHashForPassword(t *testing.T) {
	password := "Admin12345678!"

	cfg := Config{
		Memory:         19456,
		Iterations:     2,
		Parallelism:    1,
		MaxMemory:      262144,
		MaxIterations:  10,
		MaxParallelism: 16,
		MaxBcryptCost:  16,
	}
	hasher, err := New(cfg)
	if err != nil {
		t.Fatalf("Failed to create hasher: %v", err)
	}

	generatedHash, err := hasher.Hash(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	_, err = hasher.Verify(password, generatedHash)
	if err != nil {
		t.Fatalf("Failed to verify newly generated hash: %v", err)
	}
	t.Logf("Generated hash for '%s': %s", password, generatedHash)
}



