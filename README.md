# meetup-rsvp-api

REST API регистраций гостей на митап. Node.js + Express, настройки читаются из `.env` через `dotenv`. База данных не используется: регистрации хранятся в памяти приложения (после перезапуска список пустой). Один e-mail можно зарегистрировать только один раз (ответ `409`).

### Структура
```
├── server.js
├── package.json
├── package-lock.json
└── .env.example
```

## API методы

В примерах порт `8070` (значение из `.env.example`).

### Проверка состояния
```bash
curl http://127.0.0.1:8070/health
```

### Зарегистрировать гостя (`plus_ones` — сколько людей он приведёт, от 0 до 5)
```bash
curl -X POST http://127.0.0.1:8070/api/v1/guests \
  -H 'Content-Type: application/json' \
  -d '{"name":"Олена","email":"olena@example.com","plus_ones":1}'
```

### Получить список (с фильтрами)
```bash
curl http://127.0.0.1:8070/api/v1/guests
curl "http://127.0.0.1:8070/api/v1/guests?checked_in=true"
curl -G http://127.0.0.1:8070/api/v1/guests --data-urlencode "name=Олена"
```

### Статистика
```bash
curl http://127.0.0.1:8070/api/v1/guests/stats
```

### Получить по ID
```bash
curl http://127.0.0.1:8070/api/v1/guests/1
```

### Отметить приход или изменить данные (частично)
```bash
curl -X PATCH http://127.0.0.1:8070/api/v1/guests/1 \
  -H 'Content-Type: application/json' \
  -d '{"checked_in":true}'
```

### Удалить
```bash
curl -X DELETE http://127.0.0.1:8070/api/v1/guests/1
```

---

## Цель задачи

Запустить приложение как systemd-сервис `meetup-rsvp.service` (Node.js, unit-файл пишется самостоятельно).

- сервис работает от отдельного системного пользователя `rsvp`: не root, без возможности входа в систему;
- приложение и его `.env` находятся в каталоге, доступном этому пользователю; `.env` не доступен остальным пользователям на чтение;
- настройки сервис берёт из `.env`;
- сервис включён в автозапуск и работает (`enabled`, `active (running)`);
- все эндпоинты отвечают, сервис переживает `systemctl restart` (список регистраций после этого пуст);
- при аварийном завершении процесса (`sudo kill -9 <PID>`) сервис поднимается сам;
- логи доступны через `journalctl`.
