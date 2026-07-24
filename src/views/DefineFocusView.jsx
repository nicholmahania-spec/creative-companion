/**
 * 01 // Define — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Added: Intent-setting step at start (phase 4 UX consistency).
 * Four single-question micro-steps replacing the open multi-field form.
 * Then proceeds to goal/who/feel/avoid steps with preview drawers (phase 5 UX consistency).
 * Writes into the same detective fields the existing Define view uses
 * (updateDetective), so switching back and forth doesn't lose data.
 */
import { useMemo, useState, Suspense, lazy, useRef, useEffect } from 'react';
import FocusShell from '../components/focus/FocusShell';
import FocusCard from '../components/focus/FocusCard';
import Button from '../components/ui/Button';
import ButtonGroup from '../components/ui/ButtonGroup';
import Card from '../components/ui/Card';
import Textarea from '../components/ui/Textarea';
const DefinePreview = lazy(() => import('../components/DefinePreview'));
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuIndicator,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuViewport,
} from '@radix-ui/react-navigation-menu';
import { Target, Users, Pencil, Palette, Eye, Package, Settings } from 'lucide-react';
import { trackFeatureUsage, startPerformanceTimer, endPerformanceTimer } from '../lib/analytics';

const WHO_PRIMARY = ['Business', 'Consumer', 'Both'];
const WHO_SECONDARY = {
  Business: ['B2B', 'B2C', 'Internal team'],
  Consumer: ['Everyday shopper', 'Enthusiast', 'Gift buyer'],
  Both: ['Mixed audience'],
};
const FEEL_WORDS = [
  'Bold', 'Calm', 'Playful', 'Trustworthy', 'Premium', 'Warm',
  'Minimal', 'Energetic', 'Timeless', 'Approachable', 'Confident',
  'Refined', 'Honest', 'Modern', 'Grounded', 'Optimistic',
];

const STEPS = [
  { id: 'goal', label: '01 // Define', icon: Target },
  { id: 'who', label: '02 Research', icon: Users },
  { id: 'feel', label: '03 Sketch', icon: Pencil },
  { id: 'avoid', label: '04 Design', icon: Palette },
  { id: 'review', label: '05 Review', icon: Eye },
  { id: 'deliver', label: '06 Deliver', icon: Package },
  { id: 'settings', label: '07 Settings', icon: Settings },
];

export default function DefineFocusView({
  activeProject,
  updateDetective,
  setActiveView,
}) {
  const detective = activeProject?.detective || {};

  // Intent setting state (phase 4)
  const [intent, setIntent] = useState('');
  const [intentSet, setIntentSet] = useState(false);

  // Original DefineView state (moved inside intentSet conditional)
  const [stepIdx, setStepIdx] = useState(0);
  const [goalDraft, setGoalDraft] = useState(detective.goal || '');
  const [whoPrimary, setWhoPrimary] = useState('');
  const [feelPicks, setFeelPicks] = useState(
    (detective.feel || '').split(',').map((s) => s.trim()).filter(Boolean)
  );
  const [avoidDraft, setAvoidDraft] = useState(detective.avoid || '');

  const stepId = STEPS[stepIdx]?.id;
  const cardKey = `${stepId}-${whoPrimary}`;

  const goNext = () => {
    const currentStepId = STEPS[stepIdx]?.id;
    let nextStepId;
    if (stepIdx < STEPS.length - 1) {
      nextStepId = STEPS[stepIdx + 1]?.id;
      setStepIdx((i) => i + 1);
      trackFeatureUsage('define_focus', 'step_next', { from: currentStepId, to: nextStepId });
    } else {
      nextStepId = 'studio';
      setActiveView?.('studio');
      trackFeatureUsage('define_focus', 'step_next', { from: currentStepId, to: nextStepId });
    }
  };
  const goBack = () => {
    if (whoPrimary && stepId === 'who') {
      setWhoPrimary('');
      trackFeatureUsage('define_focus', 'who_primary_cleared');
      return;
    }
    if (stepIdx > 0) {
      const currentStepId = STEPS[stepIdx]?.id;
      const previousStepId = STEPS[stepIdx - 1]?.id;
      setStepIdx((i) => i - 1);
      trackFeatureUsage('define_focus', 'step_back', { from: currentStepId, to: previousStepId });
    }
  };

  const secondaryChips = useMemo(
    () => (whoPrimary ? WHO_SECONDARY[whoPrimary] || [] : []),
    [whoPrimary]
  );

  const exitFocus = () => setActiveView?.('project');

  // Performance timing for steps
  const stepTimerRef = useRef(null);
  useEffect(() => {
    if (!intentSet) return;

    // If there was a previous step, end its timer
    if (stepTimerRef.current) {
      endPerformanceTimer(stepTimerRef.current);
      stepTimerRef.current = null;
    }

    // Start a timer for the current step
    const currentStepId = STEPS[stepIdx]?.id;
    if (currentStepId) {
      const timerId = `define_focus_step_${currentStepId}`;
      startPerformanceTimer(timerId);
      stepTimerRef.current = timerId;
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (stepTimerRef.current) {
        endPerformanceTimer(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    };
  }, [stepIdx, intentSet]);

  // If intent not set, show intent input first (phase 4)
  if (!intentSet) {
    return (
      <FocusShell
        stepLabel="01 // Define"
        stepIndex={0}
        stepCount={4}
        showPreviewDrawer={false}
        onExit={exitFocus}
      >
        <div className="focus-card">
          <p id="define-intent-prompt" className="focus-prompt">What do you want to accomplish in your definition session?</p>
          <input
            id="define-intent-input"
            className="focus-input-inline w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g., Define brand purpose and audience for new project"
            autoFocus
            aria-labelledby="define-intent-prompt"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && intent.trim()) {
                setIntentSet(true);
                trackFeatureUsage('define_focus', 'intent_set', { intent: intent.trim() });
              }
            }}
          />
          <div className="flex justify-end mt-4">
            <Button
              type="button"
              variant="primary"
              disabled={!intent.trim()}
              onClick={() => {
                if (intent.trim()) {
                  setIntentSet(true);
                  trackFeatureUsage('define_focus', 'intent_set', { intent: intent.trim() });
                }
              }}
            >
              Start Defining
            </Button>
          </div>
        </div>
      </FocusShell>
    );
  }

  // Main DefineView logic (only shown after intent is set) with preview drawer (phase 5)
  return (
    <FocusShell
      stepLabel="01 // Define"
      stepIndex={stepIdx}
      stepCount={STEPS.length}
      showPreviewDrawer={true}
      drawerContent={
        <Suspense fallback={<div className="animate-pulse bg-muted/50 rounded p-4 h-full flex items-center justify-center">
          <div className="space-y-4">
            <div className="h-4 w-32 bg-border rounded"></div>
            <div className="h-4 w-24 bg-border rounded"></div>
            <div className="h-4 w-40 bg-border rounded"></div>
          </div>
        </div>}>
          <DefinePreview
            activeProject={activeProject}
            updateDetective={updateDetective}
          />
        </Suspense>
      }
      onBack={stepIdx > 0 || whoPrimary ? goBack : undefined}
      onExit={exitFocus}
    >
      {/* Main layout: Sidebar + Content */}
      <div className="flex h-[calc(100%-4rem)]">
        {/* Left Sidebar: Vertical Navigation Menu */}
        <nav className="w-[20%] border-r border-border flex-shrink-0">
          <NavigationMenu>
            <NavigationMenuList className="flex flex-col h-full space-y-1 p-4">
              {STEPS.map((step, index) => {
                const isActive = stepIdx === index;
                return (
                  <NavigationMenuItem key={index} aria-disabled={!intentSet && index > 0}>
                    <NavigationMenuTrigger asChild>
                      <button
                        className={`
                          flex w-full items-center px-4 py-3 text-left text-sm font-medium transition-all
                          ${isActive
                            ? 'bg-[var(--popover)] rounded-xl font-bold border-l-2 border-[var(--dopamine)]'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        disabled={!intentSet && index > 0}
                      >
                        <step.icon className="h-4 w-4 shrink-0 mr-3" />
                        <span>{step.label}</span>
                      </button>
                    </NavigationMenuTrigger>
                    {/* Optional dropdown content for inactive items */}
                    {!isActive && (
                      <NavigationMenuContent side="top" align="start" className="z-50 mt-2">
                        <NavigationMenuViewport className="h-[200px] w-56 overflow-hidden rounded-md border bg-popover p-1 text-sm shadow-lg">
                          <NavigationMenuList className="flex flex-col space-y-1 p-2">
                            {/* Could add step-specific preview content here */}
                          </NavigationMenuList>
                        </NavigationMenuViewport>
                      </NavigationMenuContent>
                    )}
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
            {/* Optional indicator for active state */}
            <NavigationMenuIndicator className="hidden" />
          </NavigationMenu>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header with ButtonGroup */}
          <header className="flex items-center justify-between pb-3 border-b border-[var(--border-strong)]">
            <ButtonGroup className="space-x-2">
              <Button variant="outline">Capture</Button>
              <Button variant="outline">Export</Button>
              <Button variant="outline">Tools</Button>
            </ButtonGroup>
            <div className="flex items-center space-x-3">
              {/* Preview toggle is handled by FocusShell props */}
              {/* Exit button is handled by FocusShell props */}
            </div>
          </header>

          {/* Content Area */}
          <section className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-[25%_75%] gap-6">
              {/* Left Column: Main Form Content (wrapped in Card) */}
              <div className="w-full">
                <Card className="space-y-6">
                  {stepId === 'goal' && (
                    <>
                      <p className="text-zinc-800 font-medium">
                        In one sentence, this project needs to{' '}
                      </p>
                      <Textarea
                        value={goalDraft}
                        onChange={(e) => setGoalDraft(e.target.value)}
                        placeholder="do what?"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && goalDraft.trim()) {
                            updateDetective('goal', goalDraft.trim());
                            goNext();
                          }
                        }}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="primary"
                          disabled={!goalDraft.trim()}
                          onClick={() => {
                            updateDetective('goal', goalDraft.trim());
                            goNext();
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </>
                  )}

                  {stepId === 'who' && !whoPrimary && (
                    <>
                      <p className="text-zinc-800 font-medium">Who&rsquo;s this for?</p>
                      <div className="flex flex-wrap gap-2">
                        {WHO_PRIMARY.map((w) => (
                          <Button
                            key={w}
                            variant="outline"
                            size="icon"
                            onClick={() => setWhoPrimary(w)}
                            className="flex items-center justify-center px-3 py-2"
                          >
                            {w}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}

                  {stepId === 'who' && whoPrimary && (
                    <>
                      <p className="text-zinc-800 font-medium">Narrow it down:</p>
                      <div className="flex flex-wrap gap-2">
                        {secondaryChips.map((w) => (
                          <Button
                            key={w}
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              updateDetective('audience', whoPrimary + " — " + w);
                              goNext();
                            }}
                            className="flex items-center justify-center px-3 py-2"
                          >
                            {w}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}

                  {stepId === 'feel' && (
                    <>
                      <p className="text-zinc-800 font-medium">
                        Pick up to 3 words this should feel like:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {FEEL_WORDS.map((w) => {
                          const selected = feelPicks.includes(w);
                          return (
                            <Button
                              key={w}
                              variant={selected ? 'primary' : 'outline'}
                              size="icon"
                              onClick={() => {
                                let next;
                                if (selected) {
                                  next = feelPicks.filter((x) => x !== w);
                                } else if (feelPicks.length >= 3) {
                                  return;
                                } else {
                                  next = [...feelPicks, w];
                                }
                                setFeelPicks(next);
                                updateDetective('feel', next.join(', '));
                                if (next.length === 3) goNext();
                              }}
                              className="flex items-center justify-center px-3 py-2"
                            >
                              {w}
                            </Button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {feelPicks.length}/3 selected
                      </p>
                    </>
                  )}

                  {stepId === 'avoid' && (
                    <>
                      <p className="text-zinc-800 font-medium">
                        One word this brand should <em>never</em> feel like?
                      </p>
                      <Textarea
                        value={avoidDraft}
                        onChange={(e) => setAvoidDraft(e.target.value)}
                        placeholder="optional"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateDetective('avoid', avoidDraft.trim());
                            goNext();
                          }
                        }}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => {
                            updateDetective('avoid', avoidDraft.trim());
                            goNext();
                          }}
                        >
                          Done
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={goNext}
                        >
                          Skip
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Handle remaining steps (review, deliver, settings) - simplified for now */}
                  {!['goal', 'who', 'feel', 'avoid'].includes(stepId) && (
                    <div>
                      <p className="text-zinc-800 font-medium">{stepId.charAt(0).toUpperCase() + stepId.slice(1)} step</p>
                      <p className="text-muted-foreground">Content for {stepId} step would go here</p>
                      <div className="flex justify-end mt-4">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={goNext}
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Right Column: Asset Panel */}
              <div className="w-full space-y-6">
                {/* Dropzone */}
                <div className="border-dashed border-[var(--border-strong)] rounded-lg p-6 text-center">
                  <p className="text-muted-foreground">Drop images or click to upload</p>
                </div>

                {/* Color Palette */}
                <div className="space-y-4">
                  <p className="text-zinc-800 font-medium">Color Palette</p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Example colors - would come from state/theme */}
                    {[ '#EF4444', '#F97316', '#FBBF24', '#10B981', '#3B82F6', '#8B5CF6' ].map((color, index) => (
                      <div key={index} className={"w-6 h-6 rounded-full bg-" + color + " shadow-sm"} />
                    ))}
                  </div>
                </div>

                {/* Memo Pad */}
                <div className="border-0 bg-[var(--bg-canvas)] p-4 rounded">
                  <textarea
                    className="w-full h-32 resize-none bg-[var(--bg-canvas)] p-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                    placeholder="Quick notes..."
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      </FocusShell>
    );
  }