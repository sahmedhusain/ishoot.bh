package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"
)

type OpenAPI struct {
	OpenAPI    string                 `yaml:"openapi"`
	Info       Info                   `yaml:"info"`
	Servers    []Server               `yaml:"servers"`
	Tags       []Tag                  `yaml:"tags,omitempty"`
	Paths      map[string]interface{} `yaml:"paths"`
	Components Components             `yaml:"components"`
}

type Info struct {
	Title       string                 `yaml:"title"`
	Description string                 `yaml:"description"`
	Version     string                 `yaml:"version"`
	Contact     map[string]interface{} `yaml:"contact,omitempty"`
}

type Server struct {
	URL         string `yaml:"url"`
	Description string `yaml:"description,omitempty"`
}

type Tag struct {
	Name        string `yaml:"name"`
	Description string `yaml:"description,omitempty"`
}

type Components struct {
	Schemas         map[string]interface{} `yaml:"schemas,omitempty"`
	Responses       map[string]interface{} `yaml:"responses,omitempty"`
	Parameters      map[string]interface{} `yaml:"parameters,omitempty"`
	RequestBodies   map[string]interface{} `yaml:"requestBodies,omitempty"`
	SecuritySchemes map[string]interface{} `yaml:"securitySchemes,omitempty"`
}

func main() {
	combined := OpenAPI{
		OpenAPI: "3.1.0",
		Info: Info{
			Title:       "Platform API Gateway",
			Description: "Combined OpenAPI specification for all microservices in the platform routed via the API Gateway.",
			Version:     "1.0.0",
			Contact: map[string]interface{}{
				"name":  "Platform API Team",
				"email": "api@platform.test",
			},
		},
		Servers: []Server{
			{
				URL:         "http://localhost:8080",
				Description: "API Gateway (local)",
			},
		},
		Paths: make(map[string]interface{}),
		Components: Components{
			Schemas:         make(map[string]interface{}),
			Responses:       make(map[string]interface{}),
			Parameters:      make(map[string]interface{}),
			RequestBodies:   make(map[string]interface{}),
			SecuritySchemes: make(map[string]interface{}),
		},
	}

	// Standard security schemes
	combined.Components.SecuritySchemes["staffToken"] = map[string]interface{}{
		"type":         "http",
		"scheme":       "bearer",
		"bearerFormat": "JWT",
		"description":  "Staff access JWT issued by identity",
	}
	combined.Components.SecuritySchemes["serviceToken"] = map[string]interface{}{
		"type":         "http",
		"scheme":       "bearer",
		"bearerFormat": "JWT",
		"description":  "Internal mTLS/EdDSA service-to-service JWT",
	}
	combined.Components.SecuritySchemes["customerToken"] = map[string]interface{}{
		"type":         "http",
		"scheme":       "bearer",
		"bearerFormat": "JWT",
		"description":  "Customer web session token",
	}
	combined.Components.SecuritySchemes["itToken"] = map[string]interface{}{
		"type":         "http",
		"scheme":       "bearer",
		"bearerFormat": "JWT",
		"description":  "IT operator access token",
	}
	combined.Components.SecuritySchemes["userToken"] = map[string]interface{}{
		"type":         "http",
		"scheme":       "bearer",
		"bearerFormat": "JWT",
		"description":  "User access token",
	}

	servicesDir := "services"
	if _, err := os.Stat(servicesDir); os.IsNotExist(err) {
		servicesDir = "backend/services"
	}
	entries, err := os.ReadDir(servicesDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading services directory: %v\n", err)
		os.Exit(1)
	}

	var serviceNames []string
	for _, e := range entries {
		if e.IsDir() {
			apiFile := filepath.Join(servicesDir, e.Name(), "api", "openapi.yaml")
			if _, err := os.Stat(apiFile); err == nil {
				serviceNames = append(serviceNames, e.Name())
			}
		}
	}
	sort.Strings(serviceNames)

	tagSet := make(map[string]bool)

	// Ensure Web, Admin, and IT tags exist
	combined.Tags = append(combined.Tags,
		Tag{Name: "Web", Description: "Endpoints used by the Web application"},
		Tag{Name: "Admin", Description: "Endpoints used by the Admin operational application"},
		Tag{Name: "IT", Description: "Endpoints used by the IT Management portal"},
	)
	tagSet["Web"] = true
	tagSet["Admin"] = true
	tagSet["IT"] = true

	httpMethods := map[string]bool{
		"get":     true,
		"post":    true,
		"put":     true,
		"delete":  true,
		"patch":   true,
		"options": true,
		"head":    true,
		"trace":   true,
	}

	for _, svc := range serviceNames {
		svcTag := strings.ToUpper(svc[:1]) + svc[1:]
		if svc == "cms" || svc == "itsm" || svc == "hr" {
			svcTag = strings.ToUpper(svc)
		}
		if !tagSet[svcTag] {
			combined.Tags = append(combined.Tags, Tag{Name: svcTag, Description: fmt.Sprintf("%s micro-service endpoints", svcTag)})
			tagSet[svcTag] = true
		}

		apiFile := filepath.Join(servicesDir, svc, "api", "openapi.yaml")
		data, err := os.ReadFile(filepath.Clean(apiFile))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading %s: %v\n", apiFile, err)
			continue
		}

		var doc struct {
			Paths      map[string]map[string]interface{} `yaml:"paths"`
			Components struct {
				Schemas         map[string]interface{} `yaml:"schemas"`
				Responses       map[string]interface{} `yaml:"responses"`
				Parameters      map[string]interface{} `yaml:"parameters"`
				RequestBodies   map[string]interface{} `yaml:"requestBodies"`
				SecuritySchemes map[string]interface{} `yaml:"securitySchemes"`
			} `yaml:"components"`
		}

		if err := yaml.Unmarshal(data, &doc); err != nil {
			fmt.Fprintf(os.Stderr, "Error unmarshalling %s: %v\n", apiFile, err)
			continue
		}

		// Merge components
		for k, v := range doc.Components.Schemas {
			finalName := k
			if k == "RecordPaymentRequest" && svc == "commerce" {
				finalName = "CommerceRecordPaymentRequest"
			}
			if _, exists := combined.Components.Schemas[finalName]; !exists {
				combined.Components.Schemas[finalName] = v
			}
		}
		for k, v := range doc.Components.Responses {
			if _, exists := combined.Components.Responses[k]; !exists {
				combined.Components.Responses[k] = v
			}
		}
		for k, v := range doc.Components.Parameters {
			finalName := k
			if k == "Realm" && (svc == "notify" || svc == "realtime") {
				finalName = "QueryRealm"
			}
			if _, exists := combined.Components.Parameters[finalName]; !exists {
				combined.Components.Parameters[finalName] = v
			}
		}
		for k, v := range doc.Components.RequestBodies {
			if _, exists := combined.Components.RequestBodies[k]; !exists {
				combined.Components.RequestBodies[k] = v
			}
		}
		for k, v := range doc.Components.SecuritySchemes {
			if _, exists := combined.Components.SecuritySchemes[k]; !exists {
				combined.Components.SecuritySchemes[k] = v
			}
		}

		// Merge paths and decorate operation tags
		for pathStr, pathItem := range doc.Paths {
			// Check for path-level parameters
			var pathLevelParams []interface{}
			if rawParams, ok := pathItem["parameters"].([]interface{}); ok {
				pathLevelParams = rawParams
			}

			for key, val := range pathItem {
				if !httpMethods[strings.ToLower(key)] {
					continue
				}

				if opMap, ok := val.(map[string]interface{}); ok {
					var opTags []string
					if rawTags, ok := opMap["tags"].([]interface{}); ok {
						for _, t := range rawTags {
							if ts, ok := t.(string); ok && ts != "" {
								opTags = append(opTags, ts)
							}
						}
					}

					// Ensure operation description exists for spectral
					if desc, ok := opMap["description"].(string); !ok || strings.TrimSpace(desc) == "" {
						if summary, ok := opMap["summary"].(string); ok && strings.TrimSpace(summary) != "" {
							opMap["description"] = summary
						} else {
							opMap["description"] = fmt.Sprintf("%s operation for %s", key, pathStr)
						}
					}

					// Inherit path-level parameters if needed
					if len(pathLevelParams) > 0 {
						var existingParams []interface{}
						if ep, ok := opMap["parameters"].([]interface{}); ok {
							existingParams = ep
						}
						// If op has no params, copy path level params
						if len(existingParams) == 0 {
							opMap["parameters"] = pathLevelParams
						}
					}

					// Add domain tag
					opTags = append(opTags, svcTag)

					// Categorize by target front-end app
					isWeb := strings.HasPrefix(pathStr, "/v1/cms/") ||
						strings.HasPrefix(pathStr, "/v1/commerce/") ||
						strings.HasPrefix(pathStr, "/v1/files/") ||
						pathStr == "/v1/sales/inquiries" ||
						pathStr == "/v1/sales/quotations/{id}/accept" ||
						strings.HasPrefix(pathStr, "/v1/identity/customer") ||
						strings.HasPrefix(pathStr, "/v1/identity/session")

					isIT := strings.HasPrefix(pathStr, "/v1/itsm/desk") ||
						strings.HasPrefix(pathStr, "/v1/system/") ||
						strings.HasPrefix(pathStr, "/v1/audit/") ||
						strings.HasPrefix(pathStr, "/v1/notify/") ||
						strings.HasPrefix(pathStr, "/v1/realtime/") ||
						strings.HasPrefix(pathStr, "/v1/identity/accounts")

					isAdmin := !isWeb || strings.HasPrefix(pathStr, "/v1/cms/") || strings.HasPrefix(pathStr, "/v1/commerce/")

					if isWeb {
						opTags = append(opTags, "Web")
					}
					if isAdmin {
						opTags = append(opTags, "Admin")
					}
					if isIT {
						opTags = append(opTags, "IT")
					}

					// Deduplicate tags
					tagDedup := make(map[string]bool)
					var finalTags []string
					for _, t := range opTags {
						if !tagDedup[t] {
							tagDedup[t] = true
							finalTags = append(finalTags, t)
							if !tagSet[t] {
								combined.Tags = append(combined.Tags, Tag{Name: t, Description: t})
								tagSet[t] = true
							}
						}
					}
					opMap["tags"] = finalTags

					// If commerce RecordPaymentRequest was referenced, update reference
					if svc == "commerce" {
						updateRef(opMap, "#/components/schemas/RecordPaymentRequest", "#/components/schemas/CommerceRecordPaymentRequest")
					}
					// If notify or realtime Realm was referenced, update to QueryRealm
					if svc == "notify" || svc == "realtime" {
						updateRef(opMap, "#/components/parameters/Realm", "#/components/parameters/QueryRealm")
					}

					pathItem[key] = opMap
				}
			}
			combined.Paths[pathStr] = pathItem
		}
	}

	encoder := yaml.NewEncoder(os.Stdout)
	encoder.SetIndent(2)
	if err := encoder.Encode(combined); err != nil {
		fmt.Fprintf(os.Stderr, "Error encoding combined openapi YAML: %v\n", err)
		os.Exit(1)
	}
}

func updateRef(v interface{}, oldRef, newRef string) {
	switch node := v.(type) {
	case map[string]interface{}:
		for k, val := range node {
			if k == "$ref" && val == oldRef {
				node[k] = newRef
			} else {
				updateRef(val, oldRef, newRef)
			}
		}
	case []interface{}:
		for _, elem := range node {
			updateRef(elem, oldRef, newRef)
		}
	}
}
