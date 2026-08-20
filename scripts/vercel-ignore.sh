#!/usr/bin/env bash
# Ignored Build Step для Vercel: коммит, задевший только админку, не должен
# пересобирать клиентское приложение.
#
# В настройках проекта (Settings → Git → Ignored Build Step):
#   bash ../../scripts/vercel-ignore.sh web
#   bash ../../scripts/vercel-ignore.sh admin
#
# Договорённость Vercel обратная привычной: выход 0 — сборку ПРОПУСТИТЬ,
# выход 1 — собирать. `git diff --quiet` отвечает ровно так же (0 — различий
# нет), поэтому проверка тут одна строка и никаких `if`.

set -u
app="${1:?нужно имя приложения: web или admin}"
cd "$(dirname "$0")/.." || exit 1

# Первый деплой или мелкий клон: предыдущего коммита нет — собираем
git rev-parse HEAD^ >/dev/null 2>&1 || exit 1

# Общие пакеты и корневые файлы задевают оба приложения: правка кнопки
# в packages/ui обязана пересобрать и клиент, и админку
git diff --quiet HEAD^ HEAD -- \
  "apps/$app" \
  packages \
  package.json \
  package-lock.json \
  tsconfig.base.json
