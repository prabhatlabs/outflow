// Package email sends transactional emails through Resend.
package email

import (
	"errors"
	"strings"

	"github.com/prabhatlabs/outflow/internal/lib"
	resend "github.com/resend/resend-go/v4"
)

const defaultFrom = "Outflow <no-reply@outflow.lol>"

var (
	client     *resend.Client
	from       string
	notStarted = errors.New("email: client not initialized, call email.Init() after lib.LoadEnv()")
)

func Init() {
	if strings.TrimSpace(lib.Envs.RESEND_API_KEY) == "" {
		return
	}
	client = resend.NewClient(lib.Envs.RESEND_API_KEY)
	from = lib.Envs.EMAIL_FROM
	if strings.TrimSpace(from) == "" {
		from = defaultFrom
	}
}

func Send(msg Message) error {
	if client == nil {
		return notStarted
	}
	_, err := client.Emails.Send(&resend.SendEmailRequest{
		From:    from,
		To:      []string{msg.To},
		Subject: msg.Subject,
		Html:    msg.HTML,
		Text:    msg.Text,
	})
	return err
}
