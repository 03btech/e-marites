package config

import (
	"errors"
	"fmt"
	"os"
	"time"
)

type JWTConfig struct {
	Secret     string
	Expiration time.Duration
}

func LoadJWTConfig() (*JWTConfig, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, errors.New("JWT_SECRET not set in environment")
	}

	expStr := os.Getenv("JWT_EXPIRATION")
	if expStr == "" {
		expStr = "24h" // Default expiration
	}

	expiration, err := time.ParseDuration(expStr)
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_EXPIRATION format: %v", err)
	}

	return &JWTConfig{
		Secret:     secret,
		Expiration: expiration,
	}, nil
}
