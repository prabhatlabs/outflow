package log

import (
	"log"
	"runtime"
)

func ServerErrLog(err error, message string) {
	_, file, line, ok := runtime.Caller(2)
	if !ok {
		file = "???"
		line = 0
	}
	if err != nil {
		log.Printf("[ERROR] %s:%d | err=%v | msg=%s", file, line, err, message)
	} else {
		log.Printf("[ERROR] %s:%d | msg=%s", file, line, message)
	}
}

func ServerInfoLog(message string) {
	_, file, line, ok := runtime.Caller(2)
	if !ok {
		file = "???"
		line = 0
	}
	log.Printf("\n\n[INFO] %s:%d | msg=%s\n\n", file, line, message)
}
