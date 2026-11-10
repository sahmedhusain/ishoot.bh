package main
import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
)
func main() {
	in := flag.String("in", "", "catalogue directory (contracts/catalog)")
	out := flag.String("out", "", "destination directory (pkg/catalog/data)")
	flag.Parse()
	if err := run(*in, *out); err != nil {
		fmt.Fprintln(os.Stderr, "catalog-sync:", err)
		os.Exit(1)
	}
}
func run(in, out string) error {
	if in == "" || out == "" {
		return fmt.Errorf("-in and -out are required")
	}
	files, err := filepath.Glob(filepath.Join(in, "*.json"))
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("no catalogue files in %s", in)
	}
	stale, err := filepath.Glob(filepath.Join(out, "*.json"))
	if err != nil {
		return err
	}
	for _, file := range stale {
		if err := os.Remove(file); err != nil {
			return err
		}
	}
	for _, file := range files {
		body, err := os.ReadFile(filepath.Clean(file))
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(out, filepath.Base(file)), body, 0o644); err != nil {
			return err
		}
	}
	return nil
}
