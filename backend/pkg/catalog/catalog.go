package catalog
import (
	"bytes"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"slices"
)
var files embed.FS
type Access struct {
	Resources		[]string			`json:"resources"`
	Actions			[]string			`json:"actions"`
	Roles			[]string			`json:"roles"`
	LegacyRoleIDs		map[string]string		`json:"legacyRoleIds,omitempty"`
	ResourceModules		map[string]string		`json:"resourceModules,omitempty"`
	PermissionGroups	[]PermissionGroup		`json:"permissionGroups,omitempty"`
	DefaultRoleRules	map[string]map[string][]string	`json:"defaultRoleRules"`
}
type PermissionGroup struct {
	Key		string		`json:"key"`
	Resources	[]string	`json:"resources"`
}
type Module struct {
	Key			string	`json:"key"`
	NameEn			string	`json:"nameEn"`
	NameAr			string	`json:"nameAr"`
	EnabledByDefault	bool	`json:"enabledByDefault"`
}
type DataScopes struct {
	Areas		[]string			`json:"areas"`
	Scopes		[]string			`json:"scopes"`
	Defaults	map[string]map[string]string	`json:"defaults"`
}
type ITSM struct {
	Statuses		[]string		`json:"statuses"`
	OpenStatuses		[]string		`json:"openStatuses"`
	Transitions		map[string]Transition	`json:"transitions"`
	RequesterTransitions	[]string		`json:"requesterTransitions"`
	Priorities		[]string		`json:"priorities"`
	DefaultPriority		string			`json:"defaultPriority"`
	Categories		[]TicketCategory	`json:"categories"`
}
type Transition struct {
	From	[]string	`json:"from"`
	To	string		`json:"to"`
}
type TicketCategory struct {
	Key		string		`json:"key"`
	NameEn		string		`json:"nameEn"`
	NameAr		string		`json:"nameAr"`
	Subcategories	[]Subcategory	`json:"subcategories"`
	LinksAsset	bool		`json:"linksAsset"`
}
type Subcategory struct {
	Key	string	`json:"key"`
	NameEn	string	`json:"nameEn"`
	NameAr	string	`json:"nameAr"`
}
type FileRules struct {
	URLPrefix	string		`json:"urlPrefix"`
	Types		[]FileType	`json:"types"`
	Folders		[]FileFolder	`json:"folders"`
}
type FileType struct {
	MIME		string			`json:"mime"`
	Extensions	[]string		`json:"extensions"`
	Signatures	[][]SignaturePart	`json:"signatures"`
}
type SignaturePart struct {
	Offset	int	`json:"offset"`
	Hex	string	`json:"hex"`
	bytes	[]byte
}
type FileFolder struct {
	Key	string		`json:"key"`
	Public	bool		`json:"public"`
	Types	[]string	`json:"types"`
}
type IntegrationField struct {
	Key		string	`json:"key"`
	Secret		bool	`json:"secret,omitempty"`
	Required	bool	`json:"required,omitempty"`
	MaxLength	int	`json:"maxLength,omitempty"`
}
type IntegrationProvider struct {
	ID		string			`json:"id"`
	Kind		string			`json:"kind"`
	Platforms	[]string		`json:"platforms"`
	Fields		[]IntegrationField	`json:"fields"`
	DocsURL		string			`json:"docsUrl"`
}
type IntegrationCatalog struct {
	Providers		[]IntegrationProvider	`json:"providers"`
	Environments		[]string		`json:"environments"`
	PaytabsRegions		map[string]string	`json:"paytabsRegions"`
	SocialPlatforms		[]string		`json:"socialPlatforms"`
	SocialOwnerMetrics	[]string		`json:"socialOwnerMetrics"`
}
var (
	StaffAccess	Access
	ITAccess	Access
	Modules		[]Module
	Scopes		DataScopes
	Tickets		ITSM
	Files		FileRules
	Integrations	IntegrationCatalog
)
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
	must(decode("integrations.json", &Integrations))
	Modules = modules.Modules
	must(StaffAccess.validate("staff"))
	must(ITAccess.validate("it"))
	must(Scopes.validate(StaffAccess))
	must(Tickets.validate())
	must(Files.validate())
	must(Integrations.validate())
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
func (a Access) DefaultAllows(role, resource, action string) bool {
	if a.isStaff() && role == SuperAdminRole {
		return true
	}
	return slices.Contains(a.DefaultRoleRules[role][resource], action)
}
func (a Access) CanonicalRole(role string) string {
	if replacement, ok := a.LegacyRoleIDs[role]; ok {
		return replacement
	}
	return role
}
func (a Access) ModuleOf(resource string) (string, bool) {
	module, ok := a.ResourceModules[resource]
	return module, ok
}
func (a Access) isStaff() bool	{ return slices.Contains(a.Roles, SuperAdminRole) }
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
func ModuleEnabledByDefault(key string) bool {
	for _, m := range Modules {
		if m.Key == key {
			return m.EnabledByDefault
		}
	}
	return true
}
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
func (t ITSM) Next(status, transition string) (string, bool) {
	tr, ok := t.Transitions[transition]
	if !ok || !slices.Contains(tr.From, status) {
		return "", false
	}
	return tr.To, true
}
func (t ITSM) IsOpen(status string) bool	{ return slices.Contains(t.OpenStatuses, status) }
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
func (f FileRules) Folder(key string) (FileFolder, bool) {
	for _, folder := range f.Folders {
		if folder.Key == key {
			return folder, true
		}
	}
	return FileFolder{}, false
}
func (f FileRules) Type(mime string) (FileType, bool) {
	for _, t := range f.Types {
		if t.MIME == mime {
			return t, true
		}
	}
	return FileType{}, false
}
func (f FileFolder) Allows(mime string) bool	{ return slices.Contains(f.Types, mime) }
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
func (c IntegrationCatalog) Provider(id string) (IntegrationProvider, bool) {
	for _, p := range c.Providers {
		if p.ID == id {
			return p, true
		}
	}
	return IntegrationProvider{}, false
}
func (c IntegrationCatalog) validate() error {
	seen := make(map[string]struct{}, len(c.Providers))
	for _, p := range c.Providers {
		if p.ID == "" {
			return fmt.Errorf("catalog: integrations: provider ID cannot be empty")
		}
		if _, exists := seen[p.ID]; exists {
			return fmt.Errorf("catalog: integrations: duplicate provider %q", p.ID)
		}
		seen[p.ID] = struct{}{}
		if p.Kind == "" {
			return fmt.Errorf("catalog: integrations: provider %q has no kind", p.ID)
		}
		fieldSeen := make(map[string]struct{}, len(p.Fields))
		for _, f := range p.Fields {
			if f.Key == "" {
				return fmt.Errorf("catalog: integrations: provider %q has field with empty key", p.ID)
			}
			if _, exists := fieldSeen[f.Key]; exists {
				return fmt.Errorf("catalog: integrations: provider %q duplicate field %q", p.ID, f.Key)
			}
			fieldSeen[f.Key] = struct{}{}
		}
	}
	return nil
}
