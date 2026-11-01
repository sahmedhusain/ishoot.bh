{{- define "platform.labels" -}}
app.kubernetes.io/part-of: platform
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{- define "platform.selector" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{- define "platform.image" -}}
{{- $g := .root.Values.global.image -}}
{{ $g.registry }}/{{ $g.repository }}/{{ .name }}:{{ default .root.Chart.AppVersion $g.tag }}
{{- end }}
