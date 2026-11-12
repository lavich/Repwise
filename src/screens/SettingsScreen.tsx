import { Download, RotateCcw, ShieldCheck, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { SafetyRules } from '@/components/SafetyNotice'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Card, SectionTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import type { AppData } from '@/domain/types'
import { backupFileName, createBackup, parseBackup, serializeBackup } from '@/storage/backup'
import { plural } from '@/lib/format'
import { replaceData, resetAll, updateSettings } from '@/state/actions'
import { getData, useAppData } from '@/state/store'

async function exportBackup(): Promise<string> {
  const now = new Date()
  const json = serializeBackup(createBackup(getData(), now.toISOString()))
  const file = new File([json], backupFileName(now), { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Резервная копия Repwise' })
      return 'Резервная копия готова.'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return ''
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'Если файл не появился в «Загрузках» или «Файлах», откройте приложение в Safari и повторите экспорт.'
}

export function SettingsScreen() {
  const { settings, sessions } = useAppData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = parseBackup(await file.text(), new Date().toISOString())
    if (result.ok) setPendingImport(result.data)
    else setMessage({ text: result.error, error: true })
  }

  return (
    <>
      <ScreenHeader title="Настройки" />
      <div className="space-y-6">
        <section>
          <SectionTitle>Оформление</SectionTitle>
          <Card>
            <Segmented
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              label="Тема"
              options={[
                { value: 'dark', label: 'Тёмная' },
                { value: 'light', label: 'Светлая' },
              ]}
            />
          </Card>
        </section>

        <section>
          <SectionTitle>Отдых в базовых упражнениях</SectionTitle>
          <Card>
            <Segmented
              value={settings.restSeconds}
              onChange={(restSeconds) => updateSettings({ restSeconds })}
              label="Отдых между подходами"
              options={[60, 75, 90, 120].map((s) => ({ value: s, label: `${s} с` }))}
            />
            <p className="mt-2 px-1 text-[13px] text-muted">В изолирующих упражнениях и на пресс — 60 секунд.</p>
          </Card>
        </section>

        <section>
          <SectionTitle>Безопасность</SectionTitle>
          <Card>
            <Button variant="secondary" className="w-full" onClick={() => setSafetyOpen(true)}>
              <ShieldCheck className="size-5" />
              Правила безопасности
            </Button>
          </Card>
        </section>

        <section>
          <SectionTitle>Данные</SectionTitle>
          <Card className="space-y-2">
            <p className="pb-1 text-[15px] text-muted">
              Все данные хранятся только на этом устройстве. Сохраняйте резервную копию, чтобы не потерять историю.
            </p>
            <Button variant="secondary" className="w-full" onClick={async () => setMessage({ text: await exportBackup() })}>
              <Download className="size-5" />
              Экспорт в JSON
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => fileInput.current?.click()}>
              <Upload className="size-5" />
              Импорт из JSON
            </Button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
            {message?.text && (
              <p role="status" className={message.error ? 'text-[15px] text-danger' : 'text-[15px] text-muted'}>
                {message.text}
              </p>
            )}
            <Button variant="danger" className="w-full" onClick={() => setResetOpen(true)}>
              <RotateCcw className="size-5" />
              Начать программу заново
            </Button>
          </Card>
        </section>

        <p className="pb-2 text-center text-[13px] text-muted">
          Repwise · {sessions.length} {plural(sessions.length, 'запись', 'записи', 'записей')} в истории
          <br />
          Приложение не заменяет консультацию врача.
        </p>
      </div>

      <Sheet open={safetyOpen} onClose={() => setSafetyOpen(false)} title="Правила безопасности">
        <SafetyRules />
      </Sheet>

      <Sheet open={pendingImport !== null} onClose={() => setPendingImport(null)} title="Импортировать данные?">
        <p className="text-base leading-snug">
          Текущие данные будут заменены данными из файла. Тренировок в истории: {pendingImport?.sessions.length ?? 0}.
        </p>
        <div className="mt-5 grid gap-2">
          <Button
            size="lg"
            onClick={() => {
              if (pendingImport) replaceData(pendingImport)
              setPendingImport(null)
              setMessage({ text: 'Данные импортированы.' })
            }}
          >
            Заменить данные
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setPendingImport(null)}>
            Отмена
          </Button>
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Начать заново?">
        <p className="text-base leading-snug">
          История тренировок и уровни нагрузки будут удалены. Перед этим стоит сделать экспорт.
        </p>
        <div className="mt-5 grid gap-2">
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              resetAll()
              setResetOpen(false)
            }}
          >
            Удалить данные
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setResetOpen(false)}>
            Отмена
          </Button>
        </div>
      </Sheet>
    </>
  )
}
