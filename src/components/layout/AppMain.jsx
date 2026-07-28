/**
 * AppMain — layout chrome extracted from App.jsx (memoized).
 * Receives a props bag `p` from App so the shell can split re-renders.
 */
import { memo, Suspense, lazy } from 'react'
import PathViewSkeleton from '../PathViewSkeleton'

import { JOURNEY_STEPS } from '../../lib/journey'
import JourneyGapStrip from '../JourneyGapStrip'
import BeforeAfterChip from '../BeforeAfterChip'
import { pathLabel, t as i18nT } from '../../lib/i18n'
import { packReadiness } from '../../lib/exportFiles'
import { STORAGE_EXPLAIN } from '../../lib/auth'
import { APP_BUILD, APP_BUILD_DATE, versionLabel } from '../../lib/version'
import { BREAKDOWN_DEPTHS, generateProjectMicrosteps } from '../../lib/microsteps'
import {
  toISODate,
  buildMonthGrid,
  formatMonthYear,
  formatShortDate,
  urgencyLabel,
  deadlineUrgency,
  daysUntil,
} from '../../lib/dates'
import { DEFAULT_PALETTE } from '../../lib/color'

const InsightsView = lazy(() => import('../../views/InsightsView'))
const CalendarView = lazy(() => import('../../views/CalendarView'))
const ClientsView = lazy(() => import('../../views/ClientsView'))
const SettingsView = lazy(() => import('../../views/SettingsView'))
const SparkView = lazy(() => import('../../views/SparkView'))
const ResearchView = lazy(() => import('../../views/ResearchView'))
const SketchView = lazy(() => import('../../views/SketchView'))
const DefineView = lazy(() => import('../../views/DefineView'))
const DesignView = lazy(() => import('../../views/DesignView'))
const ReviewView = lazy(() => import('../../views/ReviewView'))
const DeliverView = lazy(() => import('../../views/DeliverView'))


function AppMain(p) {
  return (
    <main className="main" id="main-content" tabIndex={-1} data-nav-dir={p.navDir}>
      {p.journeyActive && p.activeView !== 'review' && p.activeView !== 'finish' && (
        <JourneyGapStrip
          locale={p.locale}
          thisStepFilled={p.thisStepFilled}
          pathNextGap={p.pathNextGap}
          leaveBehindThin={p.leaveBehindThin}
          activeView={p.activeView}
          i18nT={i18nT}
          setActiveView={p.setActiveView}
        />
      )}
      {p.journeyActive && (
        <BeforeAfterChip
          project={p.activeProject}
          onOpen={() => p.setBeforeAfterOpen(true)}
        />
      )}
      {/* ===== HOME (multi-project) — master/detail, not a card grid ===== */}
      {p.activeView === 'home' && p.activeProjects.length > 1 && (() => {
        const sorted = [...projectsSummary].sort((a, b) => {
          const aDone = a.pathFull
          const bDone = b.pathFull
          if (aDone !== bDone) return aDone ? 1 : -1
          return 0
        })
        const selected =
          sorted.find((s) => s.project.id === p.homeSelectedProjectId) ||
          sorted[0]
        if (!selected) return null
        const pathFull = !!selected.pathFull
        const packReady = !!selected.packReady
        return (
          <section className="home-view home-md home-studio">
            <nav className="home-md-list" aria-label="Your p.projects">
              <div className="home-md-list-head">
                <h1 className="home-title" style={{ margin: 0 }}>
                  Projects
                </h1>
                <button
                  type="button"
                  className="btn btn-primary btn-sm home-new-project"
                  onClick={() => {
                    p.createNewProject()
                    p.notifyAction('New project', 'project_create', {
                      label: 'New project',
                    })
                    p.setActiveView('project')
                  }}
                >
                  + New project
                </button>
              </div>
              <ul className="home-md-rows">
                {sorted.map(({ project: p, doneCount, nextGap, pathFull: rowFull, packReady: rowPack }) => {
                  const isActive = p.id === selected.project.id
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`home-md-row${isActive ? ' is-active' : ''}`}
                        onClick={() => p.setHomeSelectedProjectId(id)}
                      >
                        <span className="home-md-row-top">
                          <span className="home-md-row-name">{p.name}</span>
                          <span className="home-md-row-count">
                            {doneCount}/7
                          </span>
                        </span>
                        <span
                          className={`home-md-row-next${rowFull ? ' is-done' : ''}`}
                        >
                          {rowPack
                            ? 'Ship'
                            : rowFull
                              ? 'Deliver'
                              : nextGap
                                ? pathLabel(p.locale, nextGap.id) || nextGap.label
                                : '—'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="home-md-detail">
              <p className="home-kicker">
                {packReady ? 'Ready' : pathFull ? 'Path full' : 'Next'}
              </p>
              <h2 className="home-title">
                {packReady
                  ? 'Brand book ready'
                  : pathFull
                    ? 'Path steps look full'
                    : selected.nextGap
                      ? pathLabel(p.locale, selected.nextGap.id) ||
                        selected.nextGap.label
                      : 'All caught up'}
              </h2>
              {pathFull && !packReady ? (
                <p className="home-kicker" style={{ marginTop: '0.35rem' }}>
                  Pack still thin — open Deliver to fill gaps or ship anyway
                </p>
              ) : null}
              <div className="home-cta-row">
                <button
                  type="button"
                  className="btn btn-primary home-cta"
                  onClick={() => {
                    if (pathFull) {
                      p.setCurrentProject(selected.project.id)
                      p.setActiveView('finish')
                      return
                    }
                    p.switchProjectAndContinue(selected.project.id)
                  }}
                >
                  {pathFull ? 'Open Deliver' : 'Continue'}
                </button>
              </div>

              <div className="home-md-strip">
                <p className="home-md-strip-label">
                  {selected.doneCount}/7
                </p>
                <div className="home-md-steps">
                  {selected.rows.map((r, i) => {
                    const num = i + 1
                    const isCurrent =
                      selected.nextGap && r.id === selected.nextGap.id
                    return (
                      <div
                        key={r.id}
                        className={`home-md-step${r.done ? ' is-done' : ''}${
                          isCurrent ? ' is-current' : ''
                        }`}
                        title={pathLabel(p.locale, r.id) || r.label}
                      >
                        <span className="home-md-step-dot">
                          {r.done ? '✓' : num}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )
      })()}
      {p.activeView === 'home' && p.activeProjects.length <= 1 && (
        <section className="home-view home-studio">
          <p className="home-eyebrow">
            {p.activeProject?.name || 'Project'}
          </p>
          {brandBookReady ? (
            <>
              <h1 className="home-title">Brand book ready</h1>
              <button
                type="button"
                className="btn btn-primary home-cta"
                onClick={() => p.setActiveView('finish')}
              >
                Open Deliver
              </button>
            </>
          ) : pathStepsFull ? (
            <>
              <h1 className="home-title">Path steps look full</h1>
              <p className="home-kicker" style={{ marginTop: '0.5rem' }}>
                Pack still thin — open Deliver to fill gaps or ship anyway
              </p>
              <button
                type="button"
                className="btn btn-primary home-cta"
                onClick={() => p.setActiveView('finish')}
              >
                Open Deliver
              </button>
            </>
          ) : p.pathNextGap ? (
            <>
              <p className="home-kicker">Next</p>
              <h1 className="home-title">
                {pathLabel(p.locale, p.pathNextGap.id) || p.pathNextGap.label}
              </h1>
              <div className="home-cta-row">
                <button
                  type="button"
                  className="btn btn-primary home-cta"
                  onClick={() => p.goToNextProcessGap()}
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="home-title">All caught up</h1>
              <button
                type="button"
                className="btn btn-primary home-cta"
                onClick={() => p.setActiveView('finish')}
              >
                Open Deliver
              </button>
            </>
          )}
          <div className="home-cta-row home-new-project-row">
            <button
              type="button"
              className="btn btn-secondary home-new-project"
              onClick={() => {
                p.createNewProject()
                p.notifyAction('New project', 'project_create', {
                  label: 'New project',
                })
                p.setActiveView('project')
              }}
            >
              + New project
            </button>
          </div>
        </section>
      )}
      {/* ===== WORK — one step owns the fold ===== */}
      {/* ===== SKETCH (lazy) ===== */}
      {p.activeView === 'flow' && (
        <Suspense fallback={<PathViewSkeleton label="Loading Work…" />}>
          <StepDependencyReminder stepId="sketch" />
          <SketchView
            locale={p.locale}
            navDir={p.navDir}
            activeProject={p.activeProject}
            projectDeadline={p.projectDeadline}
            completedCount={completedCount}
            deskTasks={p.deskTasks}
            doneTasks={doneTasks}
            queueTasks={queueTasks}
            nextTask={nextTask}
            stepFocusKey={p.stepFocusKey}
            setStepFocusKey={p.setStepFocusKey}
            showHowItWorks={showHowItWorks}
            hideHowItWorks={p.hideHowItWorks}
            openBreakdown={p.openBreakdown}
            journeyNext={p.journeyNext}
            setActiveView={p.setActiveView}
            flashToast={p.flashToast}
            flashMicro={p.flashMicro}
            notifyAction={p.notifyAction}
            quickInput={p.quickInput}
            setQuickInput={p.setQuickInput}
            captureEnergy={p.captureEnergy}
            setCaptureEnergy={p.setCaptureEnergy}
            captureDue={p.captureDue}
            setCaptureDue={p.setCaptureDue}
            captureOptionsOpen={p.captureOptionsOpen}
            setCaptureOptionsOpen={p.setCaptureOptionsOpen}
            handleCapture={p.addQuickTask}
            queueCollapsed={queueCollapsed}
            queueOpen={p.queueOpen}
            setQueueOpen={p.setQueueOpen}
            doneOpen={p.doneOpen}
            setDoneOpen={p.setDoneOpen}
            toggleTask={p.toggleTask}
            updateTaskTitle={p.updateTaskTitle}
            updateTaskMeta={p.updateTaskMeta}
            updateTaskWhy={p.updateTaskWhy}
            removeTask={p.removeTask}
            breakIntoSteps={p.breakIntoSteps}
            setTaskDueDate={p.setTaskDueDate}
            stepDueOpen={p.stepDueOpen}
            setStepDueOpen={p.setStepDueOpen}
            completeCurrentStep={p.completeCurrentStep}
            startVoice={p.startVoice}
            setDeskConfirm={p.setDeskConfirm}
          />
        </Suspense>
      )}

      {/* ===== RESEARCH (lazy) ===== */}
      {p.activeView === 'studio' && (
        <Suspense fallback={<PathViewSkeleton label="Loading Board…" />}>
          <StepDependencyReminder stepId="research" />
          <ResearchView
            locale={p.locale}
            navDir={p.navDir}
            deskMood={p.deskMood}
            activeProjectId={p.activeProjectId}
            brandWords={p.activeProject?.detective?.brandWords || ''}
            projectPalette={p.projectPalette}
            forcedBreak={p.forcedBreak}
            setActiveView={p.setActiveView}
            flashToast={p.flashToast}
            flashMicro={p.flashMicro}
            notifyAction={p.notifyAction}
            setSessionComplete={p.setSessionComplete}
            setFocusLeft={p.setFocusLeft}
            setPomodoroWorkStartedAt={p.setPomodoroWorkStartedAt}
            setIsFocusRunning={p.setIsFocusRunning}
            setTimerFocusSource={p.setTimerFocusSource}
            onAddPinModeChange={p.setResearchAddOpen}
          />
        </Suspense>
      )}

      {/* ===== SPARK (lazy) ===== */}
      {p.activeView === 'spark' && (
        <Suspense fallback={<PathViewSkeleton label="Loading…" />}>
          <StepDependencyReminder stepId="ideate" />
          <SparkView
            setActiveView={p.setActiveView}
            nextTask={nextTask}
            currentSpark={p.currentSpark}
            nextSpark={p.nextSpark}
            oppositeSpark={p.oppositeSpark}
            addMoodPin={p.addMoodPin}
            projectPalette={p.projectPalette}
            notifyAction={p.notifyAction}
            directions={p.activeProject?.directions}
            updateDirection={p.updateDirection}
            roughIdeas={p.activeProject?.roughIdeas || []}
            decisionLog={p.activeProject?.decisionLog || []}
            sparksTried={p.sparksTried || 0}
            locale={p.locale}
            flashMicro={p.flashMicro}
            addTask={p.addTask}
            projectId={p.activeProjectId}
            i18nT={(key) => i18nT(p.locale, key)}
            projectGoal={
              p.activeProject?.detective?.goal ||
              p.activeProject?.brief ||
              ''
            }
          />
        </Suspense>
      )}

      {/* ===== FOCUS (lazy) ===== */}
      {p.activeView === 'insights' && (
        <Suspense fallback={<PathViewSkeleton label="Loading timer…" />}>
          <InsightsView
            setActiveView={p.setActiveView}
            nextTask={nextTask}
            focusMinutes={focusMinutes}
            focusSeconds={focusSeconds}
            sessionLabel={p.sessionLabel}
            forcedBreak={p.forcedBreak}
            startOrPauseFocus={p.startOrPauseFocus}
            resetFocus={p.resetFocus}
            isFocusRunning={p.isFocusRunning}
            focusLeft={p.focusLeft}
            POMODORO_WORK_MIN={POMODORO_WORK_MIN}
            forceBreaksEnabled={forceBreaksEnabled}
            setPref={p.setPref}
            bodyDoubling={p.bodyDoubling}
            toggleBodyDoubling={p.toggleBodyDoubling}
            flashToast={p.flashToast}
            endForcedBreak={p.endForcedBreak}
            sessionComplete={p.sessionComplete}
            toggleTask={p.toggleTask}
            completedCount={completedCount}
            deskTasks={p.deskTasks}
            prefs={p.prefs}
            openForceBreakConsent={() => p.setForceBreakConsentOpen(true)}
            timerFocusSource={p.timerFocusSource}
            setTimerFocusSource={p.setTimerFocusSource}
            pathReturnView={p.activeProject?.lastView || 'project'}
            locale={p.locale}
          />
        </Suspense>

      )}
      {/* ===== CALENDAR (lazy) ===== */}
      {p.activeView === 'calendar' && (
        <Suspense fallback={<PathViewSkeleton label="Loading calendar…" />}>
          <CalendarView
            setActiveView={p.setActiveView}
            pathReturnView={p.activeProject?.lastView || 'project'}
            calCursor={p.calCursor}
            setCalCursor={p.setCalCursor}
            buildMonthGrid={buildMonthGrid}
            formatMonthYear={formatMonthYear}
            formatShortDate={formatShortDate}
            urgencyLabel={urgencyLabel}
            deadlineUrgency={deadlineUrgency}
            daysUntil={daysUntil}
            toISODate={toISODate}
            calendarEvents={p.calendarEvents}
            selectProject={p.selectProject}
            projectDeadline={p.projectDeadline}
            setProjectDeadline={p.setProjectDeadline}
            activeProject={p.activeProject}
            upcomingDeadlines={p.upcomingDeadlines}
          />
        </Suspense>
      )}

      {/* ===== CLIENTS (lazy) ===== */}
      {p.activeView === 'clients' && (
        <Suspense fallback={<PathViewSkeleton label="Loading clients…" />}>
          <ClientsView
            projects={p.projects}
            selectProject={p.selectProject}
            setActiveView={p.setActiveView}
          />
        </Suspense>
      )}

      {/* Concept pipeline removed from UI — Research + Design path only */}

      {/* ===== BRAND IDENTITY TEMPLATE ===== */}
      {/* ===== DESIGN (lazy) ===== */}
      {p.activeView === 'brand' && (
        <Suspense fallback={<PathViewSkeleton label="Loading System…" />}>
          <StepDependencyReminder stepId="design" />
          <DesignView
            locale={p.locale}
            navDir={p.navDir}
            activeProject={p.activeProject}
            deskMood={p.deskMood}
            projectPalette={p.projectPalette}
            hidePackWatermark={hidePackWatermark}
            setActiveView={p.setActiveView}
            flashToast={p.flashToast}
            flashMicro={p.flashMicro}
            brandEditSection={p.brandEditSection}
            setBrandEditSection={p.setBrandEditSection}
          />
        </Suspense>
      )}

      {/* ===== REVIEW (lazy) ===== */}
      {p.activeView === 'review' && (
        <Suspense fallback={<PathViewSkeleton label="Loading Review…" />}>
          <StepDependencyReminder stepId="review" />
          <ReviewView
            locale={p.locale}
            navDir={p.navDir}
            activeProject={p.activeProject}
            deskMood={p.deskMood}
            projectPalette={p.projectPalette}
            pathRows={p.pathRows}
            pathDoneCount={p.pathDoneCount}
            pathMissingLabelsList={p.pathMissingLabelsList}
            pathNextGap={p.pathNextGap}
            hidePackWatermark={hidePackWatermark}
            setActiveView={p.setActiveView}
            goToProcessStep={p.goToProcessStep}
            goSystemSection={p.goSystemSection}
            buildCurrentBrandPack={p.buildCurrentBrandPack}
            flashToast={p.flashToast}
            flashMicro={p.flashMicro}
            toggleBodyDoubling={p.toggleBodyDoubling}
            bodyDoubling={p.bodyDoubling}
          />
        </Suspense>
      )}

      {/* ===== DELIVER (lazy) ===== */}
      {p.activeView === 'finish' && (
        <Suspense fallback={<PathViewSkeleton label="Loading Pack…" />}>
          <StepDependencyReminder stepId="deliver" />
          <DeliverView
            locale={p.locale}
            navDir={p.navDir}
            activeProject={p.activeProject}
            deskMood={p.deskMood}
            deskTasks={p.deskTasks}
            completedCount={completedCount}
            projectPalette={p.projectPalette}
            pathRows={p.pathRows}
            pathDoneCount={p.pathDoneCount}
            pathMissingLabelsList={p.pathMissingLabelsList}
            pathNextGap={p.pathNextGap}
            leaveBehindThin={p.leaveBehindThin}
            hidePackWatermark={hidePackWatermark}
            setActiveView={p.setActiveView}
            goToProcessStep={p.goToProcessStep}
            goSystemSection={p.goSystemSection}
            buildCurrentBrandPack={p.buildCurrentBrandPack}
            setPref={p.setPref}
            runExport={p.runExport}
            openExportPanel={p.openExportPanel}
            flashToast={p.flashToast}
            handleSignOut={handleSignOut}
            downloadDataBackup={p.downloadDataBackup}
            createNewProject={p.createNewProject}
            notifyAction={p.notifyAction}
            CLOUD={CLOUD}
            lastExportNote={p.lastExportNote}
          />
        </Suspense>
      )}

      {/* ===== SETTINGS (lazy) ===== */}
      {p.activeView === 'settings' && (
        <Suspense fallback={<PathViewSkeleton label="Loading settings…" />}>
          <SettingsView
            setActiveView={p.setActiveView}
            CLOUD={CLOUD}
            accessName={p.accessName}
            syncState={p.syncState}
            syncError={p.syncError}
            pushWorkspace={pushWorkspace}
            exportAllData={p.exportAllData}
            setSyncState={p.setSyncState}
            setSyncError={p.setSyncError}
            handleSignOut={handleSignOut}
            theme={p.theme}
            toggleTheme={p.toggleTheme}
            reduceMotion={p.reduceMotion}
            soundEnabled={soundEnabled}
            showHowItWorks={showHowItWorks}
            showProgress={p.showProgress}
            locale={p.locale}
            queueCollapsed={queueCollapsed}
            forceBreaksEnabled={forceBreaksEnabled}
            setPref={p.setPref}
            bodyDoubling={p.bodyDoubling}
            toggleBodyDoubling={p.toggleBodyDoubling}
            flashToast={p.flashToast}
            forcedBreak={p.forcedBreak}
            endForcedBreak={p.endForcedBreak}
            prefs={p.prefs}
            pwCurrent={p.pwCurrent}
            setPwCurrent={p.setPwCurrent}
            pwNext={p.pwNext}
            setPwNext={p.setPwNext}
            changeAccessPassword={changeAccessPassword}
            downloadDataBackup={p.downloadDataBackup}
            handleImportBackup={p.handleImportBackup}
            importFileRef={p.importFileRef}
            clearToEmpty={p.clearToEmpty}
            clearAllData={p.clearAllData}
            setShowOnboarding={p.setShowOnboarding}
            loadSoftSignalDemo={p.loadSoftSignalDemo}
            versionLabel={versionLabel}
            APP_BUILD={APP_BUILD}
            APP_BUILD_DATE={APP_BUILD_DATE}
            STORAGE_EXPLAIN={STORAGE_EXPLAIN}
            notifyAction={p.notifyAction}
            createNewProject={p.createNewProject}
            requestConfirm={(label, onConfirm) =>
              p.setDeskConfirm({
                kind: 'settings',
                label,
                onConfirm: () => {
                  onConfirm?.()
                  p.setDeskConfirm(null)
                },
              })
            }
            openForceBreakConsent={() => p.setForceBreakConsentOpen(true)}
          />
        </Suspense>
      )}

{/* ===== PROJECTS ===== */}
      {/* ===== DEFINE (lazy) ===== */}
      {p.activeView === 'project' && (
        <Suspense fallback={<PathViewSkeleton label="Loading Project…" />}>
          <DefineView
            locale={p.locale}
            navDir={p.navDir}
            activeProject={p.activeProject}
            deskTasks={p.deskTasks}
            setActiveView={p.setActiveView}
            updateDetective={p.updateDetective}
            onOpenShare={() => p.setOverviewSharePanelOpen(true)}
            setProjectDeadline={p.setProjectDeadline}
            projectDeadline={p.projectDeadline}
          />
        </Suspense>
      )}

    </main>

  )
}

export default memo(AppMain)
