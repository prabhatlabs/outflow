package email

import (
	"bytes"
	"fmt"
	"html/template"
)

// Message is a fully rendered email.
type Message struct {
	To      string
	Subject string
	HTML    string
	Text    string
}

type emailData struct {
	Subject string
	URL     string
	TTLText string
}

var tmpl = template.Must(template.New("magicLink").Parse(`<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#ffffff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;">
    <div style="max-width:480px;margin:0 auto;padding:24px 0;">
      <h1 style="font-size:20px;margin:0 0 8px;">outflow.lol</h1>
      <p style="font-size:15px;margin:0 0 24px;">Use the button below to sign in. This link expires in {{ .TTLText }} and can only be used once.</p>
      <p style="margin:0 0 24px;">
        <a href="{{ .URL }}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:15px;padding:12px 20px;border-radius:8px;">Sign in</a>
      </p>
      <p style="font-size:13px;color:#666666;word-break:break-all;">If the button does not work, paste this link into your browser:<br />{{ .URL }}</p>
    </div>
  </body>
</html>`))

func renderMagicLink(to, url, ttlText string) (Message, error) {
	data := emailData{
		Subject: "Sign in to outflow.lol",
		URL:     url,
		TTLText: ttlText,
	}

	var html bytes.Buffer
	if err := tmpl.Execute(&html, data); err != nil {
		return Message{}, fmt.Errorf("email: render magic link: %w", err)
	}

	text := fmt.Sprintf("Sign in to outflow.lol: %s\n\nThis link expires in %s and can only be used once.", url, ttlText)

	return Message{
		To:      to,
		Subject: data.Subject,
		HTML:    html.String(),
		Text:    text,
	}, nil
}

// SendMagicLink sends the email-magic-link sign-in email.
func SendMagicLink(to, url string, ttlMinutes int) error {
	msg, err := renderMagicLink(to, url, fmt.Sprintf("%d minutes", ttlMinutes))
	if err != nil {
		return err
	}
	return Send(msg)
}
