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
	Title   string
	Intro   string
}

const layout = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#ffffff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;">
    <div style="max-width:480px;margin:0 auto;padding:24px 0;">
      <h1 style="font-size:20px;margin:0 0 8px;">outflow.lol</h1>
      <h2 style="font-size:16px;margin:0 0 8px;">{{ .Title }}</h2>
      <p style="font-size:15px;margin:0 0 24px;">{{ .Intro }}</p>
      <p style="margin:0 0 24px;">
        <a href="{{ .URL }}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:15px;padding:12px 20px;border-radius:8px;">{{ .Title }}</a>
      </p>
      <p style="font-size:13px;color:#666666;word-break:break-all;">If the button does not work, paste this link into your browser:<br />{{ .URL }}</p>
    </div>
  </body>
</html>`

var tmpl = template.Must(template.New("email").Parse(layout))

func render(data emailData) (string, error) {
	var html bytes.Buffer
	if err := tmpl.Execute(&html, data); err != nil {
		return "", fmt.Errorf("email: render: %w", err)
	}
	return html.String(), nil
}

func renderMagicLink(to, url, ttlText string) (Message, error) {
	data := emailData{
		Subject: "Sign in to outflow.lol",
		URL:     url,
		TTLText: ttlText,
		Title:   "Sign in",
		Intro:   fmt.Sprintf("Use the button below to sign in. This link expires in %s and can only be used once.", ttlText),
	}

	html, err := render(data)
	if err != nil {
		return Message{}, fmt.Errorf("email: render magic link: %w", err)
	}

	text := fmt.Sprintf("Sign in to outflow.lol: %s\n\nThis link expires in %s and can only be used once.", url, ttlText)

	return Message{
		To:      to,
		Subject: data.Subject,
		HTML:    html,
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

// SendInvite notifies someone they were invited to a group.
func SendInvite(to, groupName, inviterName, url string, ttlDays int) error {
	expiry := fmt.Sprintf("%d days", ttlDays)
	intro := fmt.Sprintf("%s invited you to join \"%s\" on outflow.lol. This invitation expires in %s.", inviterName, groupName, expiry)

	data := emailData{
		Subject: fmt.Sprintf("Join %s on outflow.lol", groupName),
		URL:     url,
		TTLText: expiry,
		Title:   "Accept invitation",
		Intro:   intro,
	}

	html, err := render(data)
	if err != nil {
		return err
	}

	return Send(Message{
		To:      to,
		Subject: data.Subject,
		HTML:    html,
		Text:    fmt.Sprintf("%s\n\n%s", intro, url),
	})
}
