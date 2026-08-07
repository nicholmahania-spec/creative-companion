/**
 * Main view outlet — renders the active shell page from the view registry.
 * App.jsx owns state/orchestration and passes a single props bag.
 */
import { Suspense } from 'react'
import PathViewSkeleton from '../components/PathViewSkeleton'
import StepDependencyReminder from '../components/StepDependencyReminder'
import useAppStore from '../store/useAppStore'
import { POMODORO_WORK_MIN } from '../lib/helper/forcedBreak'
import {
  buildMonthGrid,
  formatMonthYear,
  formatShortDate,
  urgencyLabel,
  deadlineUrgency,
  daysUntil,
  toISODate,
} from '../lib/dates'
import { APP_BUILD, APP_BUILD_DATE, versionLabel } from '../lib/version'
import { STORAGE_EXPLAIN } from '../lib/auth'
import { lazyViews, skeletonLabelForView, pathStepIdForView } from './viewRegistry'

const {
  home: HomeView,
  project: DefineView,
  studio: ResearchView,
  brand: DesignView,
  flow: SketchView,
  finish: DeliverView,
  spark: SparkView,
  insights: InsightsView,
  calendar: CalendarView,
  clients: ClientsView,
  clientRecord: ClientRecordView,
  desk: DeskView,
  create: NewProjectIntake,
  book: BrandBookBuilderView,
  assets: AssetLibraryView,
  review: ReviewView,
  settings: SettingsView,
} = lazyViews

function wrap(view, node) {
  const stepId = pathStepIdForView(view)
  return (
    <Suspense fallback={<PathViewSkeleton label={skeletonLabelForView(view)} />}>
      {stepId ? <StepDependencyReminder stepId={stepId} /> : null}
      {node}
    </Suspense>
  )
}

/**
 * @param {object} p — shell props (activeView + everything pages need)
 */
export default function MainOutlet(p) {
  const {
    activeView,
    navDir,
    journeyNext,
    activeProject,
    activeProjectId,
    projectPalette,
    deskMood,
    deskTasks,
    doneTasks,
    queueTasks,
    stepFocusKey,
    setStepFocusKey,
    hideHowItWorks,
    openBreakdown,
    quickInput,
    setQuickInput,
    captureEnergy,
    setCaptureEnergy,
    captureDue,
    setCaptureDue,
    captureOptionsOpen,
    setCaptureOptionsOpen,
    addQuickTask,
    queueOpen,
    setQueueOpen,
    doneOpen,
    setDoneOpen,
    updateTaskTitle,
    updateTaskWhy,
    removeTask,
    breakIntoSteps,
    setTaskDueDate,
    stepDueOpen,
    setStepDueOpen,
    completeCurrentStep,
    startVoice,
    setActiveView,
    flashToast,
    offerUndo,
    flashMicro,
    notifyAction,
    // home
    activeProjects,
    homeOrderedSummaries,
    homeSelectedProjectId,
    setHomeSelectedProjectId,
    homeHoursRange,
    setHomeHoursRange,
    setCurrentProject,
    openProjectWhereLeftOff,
    switchProjectAndContinue,
    setClientInboxOpen,
    listRowNext,
    upcomingDeadlines,
    // research / focus
    forcedBreak,
    setSessionComplete,
    setFocusLeft,
    setPomodoroWorkStartedAt,
    setIsFocusRunning,
    setTimerFocusSource,
    setResearchAddOpen,
    // spark
    nextTask,
    currentSpark,
    nextSpark,
    oppositeSpark,
    addMoodPin,
    updateDirection,
    sparksTried,
    addTask,
    // insights
    focusMinutes,
    focusSeconds,
    sessionLabel,
    startOrPauseFocus,
    resetFocus,
    isFocusRunning,
    focusLeft,
    forceBreaksEnabled,
    setPref,
    bodyDoubling,
    toggleBodyDoubling,
    endForcedBreak,
    sessionComplete,
    toggleTask,
    completedCount,
    prefs,
    setForceBreakConsentOpen,
    timerFocusSource,
    // calendar
    calCursor,
    setCalCursor,
    calendarEvents,
    selectProject,
    projectDeadline,
    setProjectDeadline,
    // clients / desk
    projects,
    setClientRecordName,
    clientRecordName,
    pathRows,
    pathNextGap,
    clientInbox,
    projectsSummary,
    setIntakeClientName,
    intakeClientName,
    // design / review / deliver
    studioName,
    studioLogo,
    brandEditSection,
    setBrandEditSection,
    pathDoneCount,
    pathMissingLabelsList,
    goToProcessStep,
    goSystemSection,
    buildCurrentBrandPack,
    leaveBehindThin,
    bookSetup,
    runExport,
    openExportPanel,
    handleSignOut,
    downloadDataBackup,
    createNewProject,
    CLOUD,
    lastExportNote,
    // settings
    accessName,
    syncState,
    syncError,
    runCloudPush,
    exportAllData,
    setSyncState,
    setSyncError,
    theme,
    toggleTheme,
    setShortcutsOpen,
    reduceMotion,
    soundEnabled,
    showHowItWorks,
    queueCollapsed,
    pwCurrent,
    setPwCurrent,
    pwNext,
    setPwNext,
    changeAccessPassword,
    handleImportBackup,
    importFileRef,
    clearToEmpty,
    clearAllData,
    loadSoftSignalDemo,
    loadHarborHearthDemo,
    setDeskConfirm,
    updateDetective,
    setOverviewSharePanelOpen,
  } = p

  // Path-title ambient chips removed (owner): identity stamp, client
  // arrival, before/after progress line, and stage Mark done.

  if (activeView === 'home') {
    return wrap(
      'home',
      <HomeView
        activeProjects={activeProjects}
        homeOrderedSummaries={homeOrderedSummaries}
        homeSelectedProjectId={homeSelectedProjectId}
        setHomeSelectedProjectId={setHomeSelectedProjectId}
        homeHoursRange={homeHoursRange}
        setHomeHoursRange={setHomeHoursRange}
        setActiveView={setActiveView}
        setCurrentProject={setCurrentProject}
        openProjectWhereLeftOff={openProjectWhereLeftOff}
        switchProjectAndContinue={switchProjectAndContinue}
        setClientInboxOpen={setClientInboxOpen}
        listRowNext={listRowNext}
        upcomingDeadlines={upcomingDeadlines}
      />
    )
  }

  if (activeView === 'flow') {
    return wrap(
      'flow',
      <SketchView
        navDir={navDir}
        activeProject={activeProject}
        projectPalette={projectPalette}
        projectDeadline={projectDeadline}
        completedCount={completedCount}
        deskTasks={deskTasks}
        doneTasks={doneTasks}
        queueTasks={queueTasks}
        nextTask={nextTask}
        stepFocusKey={stepFocusKey}
        setStepFocusKey={setStepFocusKey}
        showHowItWorks={showHowItWorks}
        hideHowItWorks={hideHowItWorks}
        openBreakdown={openBreakdown}
        journeyNext={journeyNext}
        setActiveView={setActiveView}
        flashToast={flashToast}
        flashMicro={flashMicro}
        offerUndo={offerUndo}
        notifyAction={notifyAction}
        quickInput={quickInput}
        setQuickInput={setQuickInput}
        captureEnergy={captureEnergy}
        setCaptureEnergy={setCaptureEnergy}
        captureDue={captureDue}
        setCaptureDue={setCaptureDue}
        captureOptionsOpen={captureOptionsOpen}
        setCaptureOptionsOpen={setCaptureOptionsOpen}
        addQuickTask={addQuickTask}
        queueCollapsed={queueCollapsed}
        queueOpen={queueOpen}
        setQueueOpen={setQueueOpen}
        doneOpen={doneOpen}
        setDoneOpen={setDoneOpen}
        toggleTask={toggleTask}
        updateTaskTitle={updateTaskTitle}
        updateTaskWhy={updateTaskWhy}
        removeTask={removeTask}
        breakIntoSteps={breakIntoSteps}
        setTaskDueDate={setTaskDueDate}
        stepDueOpen={stepDueOpen}
        setStepDueOpen={setStepDueOpen}
        completeCurrentStep={completeCurrentStep}
        startVoice={startVoice}
        setDeskConfirm={setDeskConfirm}
        forcedBreak={forcedBreak}
        setSessionComplete={setSessionComplete}
        startOrPauseFocus={startOrPauseFocus}
        resetFocus={resetFocus}
        isFocusRunning={isFocusRunning}
        focusLeft={focusLeft}
        setFocusLeft={setFocusLeft}
        setPomodoroWorkStartedAt={setPomodoroWorkStartedAt}
        setIsFocusRunning={setIsFocusRunning}
        setTimerFocusSource={setTimerFocusSource}
        sessionLabel={sessionLabel}
        sessionComplete={sessionComplete}
      />
    )
  }

  if (activeView === 'studio') {
    return wrap(
      'studio',
      <ResearchView
        navDir={navDir}
        journeyNext={journeyNext}
        deskMood={deskMood}
        activeProjectId={activeProjectId}
        brandWords={activeProject?.detective?.brandWords || ''}
        projectPalette={projectPalette}
        forcedBreak={forcedBreak}
        setActiveView={setActiveView}
        flashToast={flashToast}
        flashMicro={flashMicro}
        notifyAction={notifyAction}
        setSessionComplete={setSessionComplete}
        setFocusLeft={setFocusLeft}
        setPomodoroWorkStartedAt={setPomodoroWorkStartedAt}
        setIsFocusRunning={setIsFocusRunning}
        setTimerFocusSource={setTimerFocusSource}
        onAddPinModeChange={setResearchAddOpen}
      />
    )
  }

  if (activeView === 'spark') {
    return wrap(
      'spark',
      <SparkView
        setActiveView={setActiveView}
        nextTask={nextTask}
        currentSpark={currentSpark}
        nextSpark={nextSpark}
        oppositeSpark={oppositeSpark}
        addMoodPin={addMoodPin}
        projectPalette={projectPalette}
        notifyAction={notifyAction}
        directions={activeProject?.directions}
        updateDirection={updateDirection}
        roughIdeas={activeProject?.roughIdeas || []}
        decisionLog={activeProject?.decisionLog || []}
        sparksTried={sparksTried || 0}
        flashMicro={flashMicro}
        addTask={addTask}
        projectId={activeProjectId}
        projectGoal={
          activeProject?.detective?.goal || activeProject?.brief || ''
        }
      />
    )
  }

  if (activeView === 'insights') {
    return wrap(
      'insights',
      <InsightsView
        setActiveView={setActiveView}
        nextTask={nextTask}
        focusMinutes={focusMinutes}
        focusSeconds={focusSeconds}
        sessionLabel={sessionLabel}
        forcedBreak={forcedBreak}
        startOrPauseFocus={startOrPauseFocus}
        resetFocus={resetFocus}
        isFocusRunning={isFocusRunning}
        focusLeft={focusLeft}
        POMODORO_WORK_MIN={POMODORO_WORK_MIN}
        forceBreaksEnabled={forceBreaksEnabled}
        setPref={setPref}
        bodyDoubling={bodyDoubling}
        toggleBodyDoubling={toggleBodyDoubling}
        flashToast={flashToast}
        endForcedBreak={endForcedBreak}
        sessionComplete={sessionComplete}
        toggleTask={toggleTask}
        completedCount={completedCount}
        deskTasks={deskTasks}
        prefs={prefs}
        openForceBreakConsent={() => setForceBreakConsentOpen(true)}
        timerFocusSource={timerFocusSource}
        setTimerFocusSource={setTimerFocusSource}
      />
    )
  }

  if (activeView === 'calendar') {
    return wrap(
      'calendar',
      <CalendarView
        setActiveView={setActiveView}
        calCursor={calCursor}
        setCalCursor={setCalCursor}
        buildMonthGrid={buildMonthGrid}
        formatMonthYear={formatMonthYear}
        formatShortDate={formatShortDate}
        urgencyLabel={urgencyLabel}
        deadlineUrgency={deadlineUrgency}
        daysUntil={daysUntil}
        toISODate={toISODate}
        calendarEvents={calendarEvents}
        selectProject={selectProject}
        projectDeadline={projectDeadline}
        setProjectDeadline={setProjectDeadline}
        activeProject={activeProject}
        upcomingDeadlines={upcomingDeadlines}
      />
    )
  }

  if (activeView === 'clients') {
    return wrap(
      'clients',
      <ClientsView
        projects={projects}
        selectProject={selectProject}
        setActiveView={setActiveView}
        openClientRecord={(name) => {
          setClientRecordName(name)
          setActiveView('clientRecord')
        }}
      />
    )
  }

  if (activeView === 'desk') {
    return wrap(
      'desk',
      <DeskView
        project={activeProject}
        palette={projectPalette}
        pins={deskMood}
        rows={pathRows}
        nextGap={pathNextGap}
        tasks={deskTasks}
        clientInbox={clientInbox}
        onOpenView={setActiveView}
        onOpenSection={goSystemSection}
        onOpenClientInbox={() => setClientInboxOpen(true)}
        onToggleTask={toggleTask}
        onToggleNotNeeded={(stepId) =>
          activeProject &&
          useAppStore
            .getState()
            .toggleStepNotNeeded(activeProject.id, stepId)
        }
        onMarkStepDone={(stepId, done) =>
          activeProject &&
          useAppStore.getState().setStepDone(stepId, done, activeProject.id)
        }
        onEditIdentity={() => setActiveView('brand')}
        onEditBrief={() => setActiveView('project')}
        onOpenWall={() => setActiveView('studio')}
        onOpenAssets={() => setActiveView('finish')}
      />
    )
  }

  if (activeView === 'clientRecord') {
    return wrap(
      'clientRecord',
      <ClientRecordView
        clientName={clientRecordName}
        projects={projects}
        projectsSummary={projectsSummary}
        listRowNext={listRowNext}
        openProject={openProjectWhereLeftOff}
        onNewProject={(name) => {
          setIntakeClientName(name)
          setActiveView('create')
        }}
        flashMicro={flashMicro}
      />
    )
  }

  if (activeView === 'create') {
    return wrap(
      'create',
      <NewProjectIntake
        setActiveView={setActiveView}
        flashToast={flashToast}
        initialClientName={intakeClientName}
        onDone={() => setIntakeClientName('')}
      />
    )
  }

  if (activeView === 'book') {
    /* The builder's "not in the book yet" list names the stop each gap is
       waiting on. It could say so but not take you there, which made it a
       list of things you cannot act on. */
    return wrap('book', <BrandBookBuilderView setActiveView={setActiveView} />)
  }

  if (activeView === 'assets') {
    return wrap('assets', <AssetLibraryView navDir={navDir} cloud={CLOUD} flashToast={flashToast} />)
  }

  if (activeView === 'brand') {
    return wrap(
      'brand',
      <DesignView
        navDir={navDir}
        journeyNext={journeyNext}
        activeProject={activeProject}
        deskMood={deskMood}
        projectPalette={projectPalette}
        studioName={studioName}
        setActiveView={setActiveView}
        flashToast={flashToast}
        offerUndo={offerUndo}
        flashMicro={flashMicro}
        brandEditSectionProp={brandEditSection}
        setBrandEditSectionProp={setBrandEditSection}
      />
    )
  }

  if (activeView === 'review') {
    return wrap(
      'review',
      <ReviewView
        navDir={navDir}
        activeProject={activeProject}
        deskMood={deskMood}
        projectPalette={projectPalette}
        pathRows={pathRows}
        pathDoneCount={pathDoneCount}
        pathMissingLabelsList={pathMissingLabelsList}
        pathNextGap={pathNextGap}
        studioName={studioName}
        setActiveView={setActiveView}
        goToProcessStep={goToProcessStep}
        goSystemSection={goSystemSection}
        buildCurrentBrandPack={buildCurrentBrandPack}
        flashToast={flashToast}
        flashMicro={flashMicro}
        toggleBodyDoubling={toggleBodyDoubling}
        bodyDoubling={bodyDoubling}
      />
    )
  }

  if (activeView === 'finish') {
    return wrap(
      'finish',
      <DeliverView
        navDir={navDir}
        activeProject={activeProject}
        projectPalette={projectPalette}
        deskTasks={deskTasks}
        completedCount={completedCount}
        pathRows={pathRows}
        pathDoneCount={pathDoneCount}
        pathMissingLabelsList={pathMissingLabelsList}
        pathNextGap={pathNextGap}
        leaveBehindThin={leaveBehindThin}
        studioName={studioName}
        studioLogo={studioLogo}
        prefs={prefs}
        bookSetup={bookSetup}
        setActiveView={setActiveView}
        goToProcessStep={goToProcessStep}
        goSystemSection={goSystemSection}
        buildCurrentBrandPack={buildCurrentBrandPack}
        setPref={setPref}
        runExport={runExport}
        openExportPanel={openExportPanel}
        flashToast={flashToast}
        handleSignOut={handleSignOut}
        downloadDataBackup={downloadDataBackup}
        createNewProject={createNewProject}
        notifyAction={notifyAction}
        CLOUD={CLOUD}
        lastExportNote={lastExportNote}
        offerUndo={offerUndo}
        openPortalPanel={() => setOverviewSharePanelOpen(true)}
      />
    )
  }

  if (activeView === 'settings') {
    return wrap(
      'settings',
      <SettingsView
        setActiveView={setActiveView}
        CLOUD={CLOUD}
        accessName={accessName}
        syncState={syncState}
        syncError={syncError}
        runCloudPush={runCloudPush}
        handleSignOut={handleSignOut}
        theme={theme}
        toggleTheme={toggleTheme}
        openShortcuts={() => setShortcutsOpen(true)}
        reduceMotion={reduceMotion}
        setPref={setPref}
        flashToast={flashToast}
        prefs={prefs}
        pwCurrent={pwCurrent}
        setPwCurrent={setPwCurrent}
        pwNext={pwNext}
        setPwNext={setPwNext}
        changeAccessPassword={changeAccessPassword}
        downloadDataBackup={downloadDataBackup}
        handleImportBackup={handleImportBackup}
        importFileRef={importFileRef}
        clearToEmpty={clearToEmpty}
        clearAllData={clearAllData}
        loadSoftSignalDemo={loadSoftSignalDemo}
        loadHarborHearthDemo={loadHarborHearthDemo}
        versionLabel={versionLabel}
        APP_BUILD_DATE={APP_BUILD_DATE}
        requestConfirm={(label, onConfirm) =>
          setDeskConfirm({
            kind: 'settings',
            label,
            onConfirm: () => {
              onConfirm?.()
              setDeskConfirm(null)
            },
          })
        }
      />
    )
  }

  if (activeView === 'project') {
    return wrap(
      'project',
      <DefineView
        navDir={navDir}
        journeyNext={journeyNext}
        activeProject={activeProject}
        setActiveView={setActiveView}
        updateDetective={updateDetective}
        onOpenShare={() => setOverviewSharePanelOpen(true)}
        setProjectDeadline={setProjectDeadline}
        projectDeadline={projectDeadline}
      />
    )
  }

  return null
}
