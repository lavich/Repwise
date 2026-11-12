import { SkipForward, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { isExerciseDone } from '@/domain/session'
import { WORKOUTS } from '@/domain/program'
import type { ActiveWorkout } from '@/domain/types'
import { requestStop } from '@/domain/workoutFlow'
import { useWakeLock } from '@/lib/hooks'
import { updateActive } from '@/state/actions'
import { ExerciseIntro } from './ExerciseIntro'
import { FeedbackView } from './FeedbackView'
import { RestView } from './RestView'
import { SetView } from './SetView'
import { SkipSheet } from './SkipSheet'
import { StopSheet } from './StopSheet'
import { TechniqueView } from './TechniqueView'

export function WorkoutScreen({ active, onFinished }: { active: ActiveWorkout; onFinished: (sessionId: string) => void }) {
  const [stopOpen, setStopOpen] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  useWakeLock(active.phase !== 'feedback')

  const { session, exerciseIndex, phase } = active
  const exercise = session.exercises[exerciseIndex]
  const total = session.exercises.length
  const doneCount = session.exercises.filter(isExerciseDone).length
  const inFeedback = phase === 'feedback'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [exerciseIndex, phase])

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="pt-safe sticky top-0 z-30 border-b border-border bg-bg/90 px-4 pb-3 backdrop-blur-xl">
        <div className="flex h-12 items-center justify-between gap-2">
          {!inFeedback ? (
            <Button variant="danger" size="sm" className="rounded-full" onClick={() => setStopOpen(true)}>
              <Square className="size-4 fill-current" />
              Стоп
            </Button>
          ) : (
            <span />
          )}
          <p className="tabular min-w-0 truncate text-center text-[15px] font-semibold">
            <span className="sr-only">{WORKOUTS[session.workoutId].title}</span>
            <span aria-hidden="true">{session.workoutId}</span>
            {!inFeedback && <span className="text-muted"> · {Math.min(exerciseIndex + 1, total)} из {total}</span>}
          </p>
          {!inFeedback && phase !== 'technique' ? (
            <Button variant="ghost" size="sm" className="rounded-full text-muted" onClick={() => setSkipOpen(true)}>
              Пропустить
              <SkipForward className="size-4" />
            </Button>
          ) : (
            <span />
          )}
        </div>
        <ProgressBar value={doneCount} max={total} label="Выполнено упражнений" className="mt-2 h-1.5" />
      </header>

      <main className="flex flex-1 flex-col px-4 pt-4">
        {phase === 'intro' && exercise && <ExerciseIntro active={active} exercise={exercise} />}
        {phase === 'set' && exercise && (
          <SetView key={`${exerciseIndex}-${exercise.sets.length}`} active={active} exercise={exercise} />
        )}
        {phase === 'rest' && exercise && (
          <RestView key={`${exerciseIndex}-${exercise.sets.length}`} active={active} exercise={exercise} />
        )}
        {phase === 'technique' && exercise && <TechniqueView exercise={exercise} />}
        {inFeedback && <FeedbackView active={active} onFinished={onFinished} />}
      </main>

      <StopSheet
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        onStop={() => {
          setStopOpen(false)
          updateActive(requestStop)
        }}
      />
      {exercise && (
        <SkipSheet
          open={skipOpen}
          exercise={exercise}
          onClose={() => setSkipOpen(false)}
          onStopWorkout={() => {
            setSkipOpen(false)
            updateActive(requestStop)
          }}
        />
      )}
    </div>
  )
}
