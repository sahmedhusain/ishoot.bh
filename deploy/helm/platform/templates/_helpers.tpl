{{- define "platform.labels" -}}
app.kubernetes.io/part-of: platform
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{- define "platform.selector" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- if .component }}
app.kubernetes.io/component: {{ .component }}
{{- end }}
{{- end }}

{{- define "platform.image" -}}
{{- $g := .root.Values.global.image -}}
{{ $g.registry }}/{{ $g.repository }}/{{ .name }}:{{ default .root.Chart.AppVersion $g.tag }}
{{- end }}

{{/* The pod spec shared by a service's API, worker and migration job. Pass dict root, name, svc, args. */}}
{{- define "platform.podSpec" -}}
{{- $g := .root.Values.global -}}
{{- with $g.imagePullSecrets }}
imagePullSecrets: {{- toYaml . | nindent 2 }}
{{- end }}
automountServiceAccountToken: false
terminationGracePeriodSeconds: 30
securityContext:
  runAsNonRoot: true
  runAsUser: 65532
  runAsGroup: 65532
  fsGroup: 65532
  seccompProfile: { type: RuntimeDefault }
containers:
  - name: {{ .name }}
    image: {{ include "platform.image" (dict "root" .root "name" .name) }}
    imagePullPolicy: {{ $g.image.pullPolicy }}
    {{- with .args }}
    args: {{- toYaml . | nindent 6 }}
    {{- end }}
    ports:
      - { name: http, containerPort: 8080 }
      - { name: admin, containerPort: 9090 }
    env:
      - { name: SERVICE_NAME, value: {{ .name | quote }} }
      - { name: SERVICE_VERSION, value: {{ default .root.Chart.AppVersion $g.image.tag | quote }} }
      - { name: APP_ENV, value: {{ $g.appEnv | quote }} }
      - { name: LOG_LEVEL, value: {{ $g.logLevel | quote }} }
      - { name: LOG_FORMAT, value: {{ $g.logFormat | quote }} }
      - { name: OTEL_EXPORTER_OTLP_ENDPOINT, value: {{ $g.otelEndpoint | quote }} }
      - { name: OTEL_EXPORTER_OTLP_INSECURE, value: "true" }
      - { name: OTEL_TRACES_SAMPLER_RATIO, value: {{ $g.tracesSampleRatio | quote }} }
      {{- range $key, $value := .svc.env }}
      - { name: {{ $key }}, value: {{ $value | quote }} }
      {{- end }}
    envFrom:
      - secretRef: { name: {{ $g.sharedSecret }} }
      - secretRef: { name: {{ .name }}-secrets, optional: true }
    {{- if .probes }}
    readinessProbe:
      httpGet: { path: /readyz, port: admin }
      periodSeconds: 10
      failureThreshold: 3
    livenessProbe:
      httpGet: { path: /livez, port: admin }
      periodSeconds: 15
      failureThreshold: 3
    startupProbe:
      httpGet: { path: /livez, port: admin }
      periodSeconds: 2
      failureThreshold: 30
    {{- end }}
    resources: {{- toYaml .svc.resources | nindent 6 }}
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities: { drop: [ALL] }
    volumeMounts:
      - { name: service-keys, mountPath: /keys, readOnly: true }
      {{- if .svc.configFiles }}
      - { name: config, mountPath: /config, readOnly: true }
      {{- end }}
volumes:
  - name: service-keys
    secret: { secretName: {{ $g.serviceKeysSecret }} }
  {{- if .svc.configFiles }}
  - name: config
    configMap: { name: {{ .name }}-config }
  {{- end }}
{{- end }}

{{/* A checksum of a service's mounted files, so pods restart when they change. */}}
{{- define "platform.configChecksum" -}}
{{- $content := "" -}}
{{- range $file := .svc.configFiles }}{{ $content = print $content ($.root.Files.Get (printf "files/%s/%s" $.name $file)) }}{{ end -}}
{{- $content | sha256sum -}}
{{- end }}
