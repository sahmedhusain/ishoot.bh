package remote
import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"path"
	"strings"
	"syscall"
	"time"
)
var (
	ErrBlocked	= errors.New("remote: address not allowed")
	ErrUnreachable	= errors.New("remote: could not fetch the file")
	ErrTooLarge	= errors.New("remote: file too large")
)
const maxURL = 2048
type Fetched struct {
	Body		[]byte
	FileName	string
}
type Fetcher struct {
	client		*http.Client
	maxBytes	int64
}
var reserved = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),
	netip.MustParsePrefix("100.64.0.0/10"),
	netip.MustParsePrefix("192.0.0.0/24"),
	netip.MustParsePrefix("192.0.2.0/24"),
	netip.MustParsePrefix("198.18.0.0/15"),
	netip.MustParsePrefix("198.51.100.0/24"),
	netip.MustParsePrefix("203.0.113.0/24"),
	netip.MustParsePrefix("240.0.0.0/4"),
	netip.MustParsePrefix("2001:db8::/32"),
}
func Public(addr netip.Addr) bool {
	addr = addr.Unmap()
	if !addr.IsValid() || addr.IsLoopback() || addr.IsPrivate() || addr.IsLinkLocalUnicast() || addr.IsLinkLocalMulticast() ||
		addr.IsMulticast() || addr.IsInterfaceLocalMulticast() || addr.IsUnspecified() {
		return false
	}
	for _, p := range reserved {
		if p.Contains(addr) {
			return false
		}
	}
	return true
}
func New(timeout time.Duration, maxBytes int64, allowPrivate bool) *Fetcher {
	dialer := &net.Dialer{Timeout: timeout, Control: func(_, address string, _ syscall.RawConn) error {
		host, _, err := net.SplitHostPort(address)
		if err != nil {
			return ErrBlocked
		}
		addr, err := netip.ParseAddr(host)
		if err != nil || (!allowPrivate && !Public(addr)) {
			return ErrBlocked
		}
		return nil
	}}
	transport := &http.Transport{
		Proxy:			nil,
		DialContext:		dialer.DialContext,
		TLSHandshakeTimeout:	timeout,
		ResponseHeaderTimeout:	timeout,
		MaxResponseHeaderBytes:	64 << 10,
		MaxIdleConns:		4,
		IdleConnTimeout:	30 * time.Second,
	}
	client := &http.Client{Transport: transport, Timeout: timeout, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return ErrBlocked
		}
		return checkURL(req.URL)
	}}
	return &Fetcher{client: client, maxBytes: maxBytes}
}
func checkURL(u *url.URL) error {
	if (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" || u.User != nil {
		return ErrBlocked
	}
	return nil
}
func (f *Fetcher) Fetch(ctx context.Context, raw string) (Fetched, error) {
	raw = strings.TrimSpace(raw)
	if len(raw) > maxURL {
		return Fetched{}, ErrBlocked
	}
	u, err := url.Parse(raw)
	if err != nil || checkURL(u) != nil {
		return Fetched{}, ErrBlocked
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return Fetched{}, ErrBlocked
	}
	req.Header.Set("Accept", "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8")
	req.Header.Set("User-Agent", "PlatformFiles/1.0 (profile picture import)")
	res, err := f.client.Do(req)
	if err != nil {
		if errors.Is(err, ErrBlocked) {
			return Fetched{}, ErrBlocked
		}
		return Fetched{}, fmt.Errorf("%w: %w", ErrUnreachable, err)
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		return Fetched{}, fmt.Errorf("%w: status %d", ErrUnreachable, res.StatusCode)
	}
	if res.ContentLength > f.maxBytes {
		return Fetched{}, ErrTooLarge
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, f.maxBytes+1))
	if err != nil {
		return Fetched{}, fmt.Errorf("%w: %w", ErrUnreachable, err)
	}
	if int64(len(body)) > f.maxBytes {
		return Fetched{}, ErrTooLarge
	}
	if len(body) == 0 {
		return Fetched{}, fmt.Errorf("%w: empty", ErrUnreachable)
	}
	name := path.Base(res.Request.URL.Path)
	if name == "." || name == "/" {
		name = ""
	}
	return Fetched{Body: body, FileName: name}, nil
}
