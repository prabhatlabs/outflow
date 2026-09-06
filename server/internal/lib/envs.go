package lib

import (
	"fmt"

	"github.com/spf13/viper"
)

type EnvsType struct {
	ENV                  string
	DATABASE_URL         string
	RESEND_API_KEY       string
	GOOGLE_CLIENT_ID     string
	GOOGLE_CLIENT_SECRET string
	AUTH_REDIRECT_URL    string
	FRONTEND_URL         string
	JWT_ACCESS_SECRET    string
	JWT_REFRESH_SECRET   string
	AUTH_COOKIE_DOMAIN   string
	SERVER_URL           string
	EMAIL_FROM           string
}

var Envs *EnvsType

func LoadEnv() error {
	viper.AddConfigPath("../.")
	viper.SetConfigName("prod")
	viper.SetConfigType("env")

	viper.AutomaticEnv()
	err := viper.ReadInConfig()
	if err != nil {
		return err
	}

	requiredKeys := []string{
		"DATABASE_URL",
		"GOOGLE_CLIENT_ID",
		"GOOGLE_CLIENT_SECRET",
		"AUTH_REDIRECT_URL",
		"JWT_ACCESS_SECRET",
		"JWT_REFRESH_SECRET",
		"FRONTEND_URL",
		"SERVER_URL",
	}

	var enverr []string

	// checking for missing envs
	for _, key := range requiredKeys {
		if !viper.IsSet(key) {
			enverr = append(enverr, fmt.Sprintf("%s is not set, ", key))
		}
	}

	if len(enverr) > 0 {
		return fmt.Errorf("missing environment variables: %v", enverr)
	}

	envs := &EnvsType{
		ENV:                  viper.GetString("ENV"),
		DATABASE_URL:         viper.GetString("DATABASE_URL"),
		RESEND_API_KEY:       viper.GetString("RESEND_API_KEY"),
		GOOGLE_CLIENT_ID:     viper.GetString("GOOGLE_CLIENT_ID"),
		GOOGLE_CLIENT_SECRET: viper.GetString("GOOGLE_CLIENT_SECRET"),
		AUTH_REDIRECT_URL:    viper.GetString("AUTH_REDIRECT_URL"),
		JWT_ACCESS_SECRET:    viper.GetString("JWT_ACCESS_SECRET"),
		JWT_REFRESH_SECRET:   viper.GetString("JWT_REFRESH_SECRET"),
		AUTH_COOKIE_DOMAIN:   viper.GetString("AUTH_COOKIE_DOMAIN"),
		FRONTEND_URL:         viper.GetString("FRONTEND_URL"),
		SERVER_URL:           viper.GetString("SERVER_URL"),
		EMAIL_FROM:           viper.GetString("EMAIL_FROM"),
	}

	if envs.ENV == "" {
		envs.ENV = "dev"
	}

	Envs = envs
	return nil
}

func IsProd() bool {
	return Envs != nil && Envs.ENV == "prod"
}
