// Package catalog exposes the shared constants (ADR 0007): permission resources, actions and role templates for the
// staff and IT realms, modules, data scopes and the IT ticket workflow. The data comes from contracts/catalog,
// copied into data/ by `go generate`; it is decoded strictly and checked for consistency when the package loads.
package catalog

//go:generate go run ../../tools/catalog-sync -in ../../../contracts/catalog -out data

import (
	"bytes"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"slices"
)

//go:embed data/*.json
var files embed.FS

// Access is the permission model of one realm.
type Access struct {
	Resources        []string                       `json:"resources"`
	Actions          []string                       `json:"actions"`
	Roles            []string                       `json:"roles"`
	LegacyRoleIDs    map[string]string              `json:"legacyRoleIds,omitempty"`
	ResourceModules  map[string]string              `json:"resourceModules,omitempty"`
	PermissionGroups []PermissionGroup              `json:"permissionGroups,omitempty"`
	DefaultRoleRules map[string]map[string][]string `json:"defaultRoleRules"`
}

// PermissionGroup orders resources in the roles matrix.
type PermissionGroup struct {
	Key       string   `json:"key"`
	Resources []string `json:"resources"`
}

// Module is an optional area a company can switch on or off.
type Module struct {
	Key              string `json:"key"`
	NameEn           string `json:"nameEn"`
	NameAr           string `json:"nameAr"`
	EnabledByDefault bool   `json:"enabledByDefault"`
}

// DataScopes controls which records a role sees per area.
type DataScopes struct {
	Areas    []string                     `json:"areas"`
	Scopes   []string                     `json:"scopes"`
	Defaults map[string]map[string]string `json:"defaults"`
}

// ITSM is the IT ticket workflow.
type ITSM struct {
	Statuses             []string              `json:"statuses"`
	OpenStatuses         []string              `json:"openStatuses"`
	Transitions          map[string]Transition `json:"transitions"`
	RequesterTransitions []string              `json:"requesterTransitions"`
	Priorities           []string              `json:"priorities"`
	DefaultPriority      string                `json:"defaultPriority"`
	Categories           []TicketCategory      `json:"categories"`
}

// Transition moves a ticket from any of From to To.
type Transition struct {
	From []string `json:"from"`
	To   string   `json:"to"`
}

// TicketCategory is a top-level ticket category with its subcategories.
type TicketCategory struct {
	Key           string        `json:"key"`
	NameEn        string        `json:"nameEn"`
	NameAr        string        `json:"nameAr"`
	Subcategories []Subcategory `json:"subcategories"`
	LinksAsset    bool          `json:"linksAsset"`
}

// Subcategory refines a ticket category.
type Subcategory struct {
	Key    string `json:"key"`
	NameEn string `json:"nameEn"`
	NameAr string `json:"nameAr"`
}

// FileRules lists the file types and storage folders uploads may use.
type FileRules struct {
	URLPrefix string       `json:"urlPrefix"`
	Types     []FileType   `json:"types"`
	Folders   []FileFolder `json:"folders"`
}

// FileType is an accepted media type, the file extensions it may carry (the first is used for new files) and the
// byte signatures that identify it: a file matches when every part of any one signature matches.
type FileType struct {
	MIME       string            `json:"mime"`
	Extensions []string          `json:"extensions"`
	Signatures [][]SignaturePart `json:"signatures"`
}

// SignaturePart is a run of bytes (hex) expected at an offset.
type SignaturePart struct {
	Offset int    `json:"offset"`
	Hex    string `json:"hex"`
	bytes  []byte
}

// FileFolder is a storage folder: public folders hold brand and website files anyone may read.
type FileFolder struct {
	Key    string   `json:"key"`
	Public bool     `json:"public"`
	Types  []string `json:"types"`
}

// The loaded catalogue.
var (
	StaffAccess Access
	ITAccess    Access
	Modules     []Module
	Scopes      DataScopes
	Tickets     ITSM
	Files       FileRules
)

// SuperAdminRole holds every staff permission regardless of stored grants.
const SuperAdminRole = "super_admin"

func init() {
	var modules struct {
		Modules []Module `json:"modules"`
	}
	must(decode("staff-access.json", &StaffAccess))
	must(decode("it-access.json", &ITAccess))
	must(decode("modules.json", &modules))
	must(decode("data-scopes.json", &Scopes))
	must(decode("itsm.json", &Tickets))
	must(decode("files.json", &Files))
	Modules = modules.Modules
	must(StaffAccess.validate("staff"))
	must(ITAccess.validate("it"))
	must(Scopes.validate(StaffAccess))
	must(Tickets.validate())
	must(Files.validate())
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}

func decode(name string, into any) error {
	body, err := files.ReadFile("data/" + name)
	if err != nil {
		return fmt.Errorf("catalog: %w", err)
	}
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	if err := dec.Decode(into); err != nil {
		return fmt.Errorf("catalog: %s: %w", name, err)
	}
	return nil
}

// DefaultAllows reports whether role's template grants action on resource. The staff super admin always passes.
func (a Access) DefaultAllows(role, resource, action string) bool {
	if a.isStaff() && role == SuperAdminRole {
		return true
	}
	return slices.Contains(a.DefaultRoleRules[role][resource], action)
}

// CanonicalRole maps a retired role ID to its replacement.
func (a Access) CanonicalRole(role string) string {
	if replacement, ok := a.LegacyRoleIDs[role]; ok {
		return replacement
	}
	return role
}

// ModuleOf returns the module a resource belongs to, if any.
func (a Access) ModuleOf(resource string) (string, bool) {
	module, ok := a.ResourceModules[resource]
	return module, ok
}

func (a Access) isStaff() bool { return slices.Contains(a.Roles, SuperAdminRole) }

func (a Access) validate(realm string) error {
	for role, rules := range a.DefaultRoleRules {
		if !slices.Contains(a.Roles, role) {
			return fmt.Errorf("catalog: %s: rules for unknown role %q", realm, role)
		}
		for resource, actions := range rules {
			if !slices.Contains(a.Resources, resource) {
				return fmt.Errorf("catalog: %s: role %q names unknown resource %q", realm, role, resource)
			}
			for _, action := range actions {
				if !slices.Contains(a.Actions, action) {
					return fmt.Errorf("catalog: %s: role %q names unknown action %q", realm, role, action)
				}
			}
		}
	}
	for resource := range a.ResourceModules {
		if !slices.Contains(a.Resources, resource) {
			return fmt.Errorf("catalog: %s: module mapping for unknown resource %q", realm, resource)
		}
	}
	return nil
}

// ModuleEnabledByDefault reports whether a module is on before anyone chose (unknown modules are on).
func ModuleEnabledByDefault(key string) bool {
	for _, m := range Modules {
		if m.Key == key {
			return m.EnabledByDefault
		}
	}
	return true
}

// DefaultScope returns the data scope a role has in an area before the company narrows it.
func (d DataScopes) DefaultScope(role, area string) string {
	if role == SuperAdminRole {
		return "all"
	}
	if scope, ok := d.Defaults[role][area]; ok {
		return scope
	}
	return "all"
}

func (d DataScopes) validate(staff Access) error {
	for role, areas := range d.Defaults {
		if !slices.Contains(staff.Roles, role) {
			return fmt.Errorf("catalog: data scopes for unknown role %q", role)
		}
		for area, scope := range areas {
			if !slices.Contains(d.Areas, area) || !slices.Contains(d.Scopes, scope) {
				return fmt.Errorf("catalog: data scope %q/%q for role %q is unknown", area, scope, role)
			}
		}
	}
	return nil
}

// Next returns the status a ticket in status moves to by transition, if the transition is allowed from there.
func (t ITSM) Next(status, transition string) (string, bool) {
	tr, ok := t.Transitions[transition]
	if !ok || !slices.Contains(tr.From, status) {
		return "", false
	}
	return tr.To, true
}

// IsOpen reports whether a ticket in status still needs work.
func (t ITSM) IsOpen(status string) bool { return slices.Contains(t.OpenStatuses, status) }

// Category returns a category by key.
func (t ITSM) Category(key string) (TicketCategory, bool) {
	for _, c := range t.Categories {
		if c.Key == key {
			return c, true
		}
	}
	return TicketCategory{}, false
}

func (t ITSM) validate() error {
	known := func(s string) bool { return slices.Contains(t.Statuses, s) }
	for _, s := range t.OpenStatuses {
		if !known(s) {
			return fmt.Errorf("catalog: itsm: unknown open status %q", s)
		}
	}
	for name, tr := range t.Transitions {
		if !known(tr.To) {
			return fmt.Errorf("catalog: itsm: transition %q leads to unknown status %q", name, tr.To)
		}
		for _, from := range tr.From {
			if !known(from) {
				return fmt.Errorf("catalog: itsm: transition %q starts from unknown status %q", name, from)
			}
		}
	}
	for _, name := range t.RequesterTransitions {
		if _, ok := t.Transitions[name]; !ok {
			return fmt.Errorf("catalog: itsm: unknown requester transition %q", name)
		}
	}
	if !slices.Contains(t.Priorities, t.DefaultPriority) {
		return fmt.Errorf("catalog: itsm: default priority %q is not a priority", t.DefaultPriority)
	}
	seen := map[string]bool{}
	for _, c := range t.Categories {
		if seen[c.Key] {
			return fmt.Errorf("catalog: itsm: duplicate category %q", c.Key)
		}
		seen[c.Key] = true
	}
	return nil
}

// DetectType returns the media type whose signature matches the file's first bytes, or "".
func (f FileRules) DetectType(head []byte) string {
	for _, t := range f.Types {
		for _, signature := range t.Signatures {
			if matchesAll(head, signature) {
				return t.MIME
			}
		}
	}
	return ""
}

// SniffLength is how many leading bytes DetectType needs to see.
func (f FileRules) SniffLength() int {
	n := 0
	for _, t := range f.Types {
		for _, signature := range t.Signatures {
			for _, part := range signature {
				n = max(n, part.Offset+len(part.bytes))
			}
		}
	}
	return n
}

func matchesAll(head []byte, signature []SignaturePart) bool {
	for _, part := range signature {
		end := part.Offset + len(part.bytes)
		if end > len(head) || !bytes.Equal(head[part.Offset:end], part.bytes) {
			return false
		}
	}
	return true
}

// Folder returns a folder by key.
func (f FileRules) Folder(key string) (FileFolder, bool) {
	for _, folder := range f.Folders {
		if folder.Key == key {
			return folder, true
		}
	}
	return FileFolder{}, false
}

// Type returns an accepted type by media type.
func (f FileRules) Type(mime string) (FileType, bool) {
	for _, t := range f.Types {
		if t.MIME == mime {
			return t, true
		}
	}
	return FileType{}, false
}

// Allows reports whether the folder accepts the media type.
func (f FileFolder) Allows(mime string) bool { return slices.Contains(f.Types, mime) }

func (f FileRules) validate() error {
	if f.URLPrefix == "" || f.URLPrefix[0] != '/' || f.URLPrefix[len(f.URLPrefix)-1] != '/' {
		return fmt.Errorf("catalog: files: urlPrefix must start and end with /")
	}
	for ti := range f.Types {
		t := &f.Types[ti]
		if len(t.Extensions) == 0 || len(t.Signatures) == 0 {
			return fmt.Errorf("catalog: files: type %q needs extensions and signatures", t.MIME)
		}
		for _, signature := range t.Signatures {
			if len(signature) == 0 {
				return fmt.Errorf("catalog: files: type %q has an empty signature", t.MIME)
			}
			for pi := range signature {
				decoded, err := hex.DecodeString(signature[pi].Hex)
				if err != nil || len(decoded) == 0 || signature[pi].Offset < 0 {
					return fmt.Errorf("catalog: files: type %q has an invalid signature", t.MIME)
				}
				signature[pi].bytes = decoded
			}
		}
	}
	for _, folder := range f.Folders {
		for _, mime := range folder.Types {
			if _, ok := f.Type(mime); !ok {
				return fmt.Errorf("catalog: files: folder %q allows unknown type %q", folder.Key, mime)
			}
		}
	}
	return nil
}
