# Модель манекена

`public/models/mannequin.glb` — манекен со скелетом, анимациями `pushup` и `band-squat` и разметкой мышц в атрибуте вершин `_MUSCLE` (0 — нет мышцы, 1–15 — группы в порядке `MUSCLE_IDS`).

## Источник и лицензия

Модель и анимация отжиманий — [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app), ревизия закреплена в `fetch_sources.sh`. Модели и анимации Mesh2Motion распространяются под CC0 1.0 (`LICENSE-CC0.MD` в их репозитории). Анимация приседаний и разметка мышц созданы скриптом `build_mannequin.py`.

## Пересборка

Нужен Blender 5.3. Побайтово тот же файл получается только на 5.3.x: экспортёр записывает в GLB свою версию.

```bash
tools/blender/fetch_sources.sh /tmp/mesh2motion
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  -P tools/blender/build_mannequin.py -- /tmp/mesh2motion public/models/mannequin.glb /tmp/mannequin-preview
```

Последний аргумент необязателен: в эту папку попадут рендеры приседаний, отжиманий, раскраски групп мышц и подсветки мышц для обоих упражнений — по ним проверяют результат. Скрипт завершается с ошибкой, если в приседаниях сдвигаются стопы или локти уходят внутрь корпуса. После пересборки запустите `npx vitest run src/components/model3d`: тесты проверяют клипы, нижнюю точку отжиманий и симметричную разметку мышц.
