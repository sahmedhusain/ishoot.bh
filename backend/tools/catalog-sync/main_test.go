package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRunValidation(t *testing.T) {
	// Missing arguments
	err := run("", "")
	assert.ErrorContains(t, err, "-in and -out are required")

	err = run("in", "")
	assert.ErrorContains(t, err, "-in and -out are required")

	// Empty in directory
	emptyIn := t.TempDir()
	out := t.TempDir()
	err = run(emptyIn, out)
	assert.ErrorContains(t, err, "no catalogue files")
}

func TestRunSuccessAndStaleCleanup(t *testing.T) {
	inDir := t.TempDir()
	outDir := t.TempDir()

	// Create catalogue JSON files in inDir
	file1 := filepath.Join(inDir, "items.json")
	file2 := filepath.Join(inDir, "categories.json")
	require.NoError(t, os.WriteFile(file1, []byte(`{"items":[]}`), 0o644))
	require.NoError(t, os.WriteFile(file2, []byte(`{"categories":[]}`), 0o644))

	// Create stale file in outDir that should be removed
	staleFile := filepath.Join(outDir, "old.json")
	require.NoError(t, os.WriteFile(staleFile, []byte(`{"old":true}`), 0o644))

	// Non-json file in outDir should NOT be removed
	nonJsonFile := filepath.Join(outDir, "readme.txt")
	require.NoError(t, os.WriteFile(nonJsonFile, []byte("keep me"), 0o644))

	// Execute run
	err := run(inDir, outDir)
	require.NoError(t, err)

	// Check copied files exist
	copied1, err := os.ReadFile(filepath.Join(outDir, "items.json"))
	require.NoError(t, err)
	assert.JSONEq(t, `{"items":[]}`, string(copied1))

	copied2, err := os.ReadFile(filepath.Join(outDir, "categories.json"))
	require.NoError(t, err)
	assert.JSONEq(t, `{"categories":[]}`, string(copied2))

	// Stale JSON file should be removed
	_, err = os.Stat(staleFile)
	assert.True(t, os.IsNotExist(err))

	// Non-json file should still exist
	_, err = os.Stat(nonJsonFile)
	assert.NoError(t, err)
}
