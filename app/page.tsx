"use client";

// Flow: Home → Choose appliance → Choose routine → Position camera → Guided task → Result.
// The controller (teammate) is the source of truth for steps, checks, and completion.
// This page only decides which screen to show and speaks what the controller says.

import { useEffect, useRef, useState } from "react";
import { APPLIANCES, useTaskController } from "@/components/controller";
import { TaskClientProvider, useClientMode } from "@/components/TaskClientProvider";
import { displayMessage } from "@/components/message";
import { DemoAccess } from "@/components/screens/DemoAccess";
import { AppHeader } from "@/components/AppHeader";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { RoutineScreen } from "@/components/screens/RoutineScreen";
import { SessionScreen } from "@/components/screens/SessionScreen";
import { ResultScreen } from "@/components/screens/ResultScreen";
import { useSpeech } from "@/hooks/useSpeech";

type Screen = "home" | "routine" | "session" | "result";

export default function Page() {
  // The client provider must sit above the component that calls useTaskController().
  return (
    <TaskClientProvider>
      <App />
    </TaskClientProvider>
  );
}

function App() {
  const controller = useTaskController();
  const mode = useClientMode();
  const speech = useSpeech();
  const [screen, setScreen] = useState<Screen>("home");
  const [applianceId, setApplianceId] = useState<string | null>(null);
  const appliance = APPLIANCES.find((a) => a.id === applianceId) ?? null;

  // Speak each new controller message once, on the screens where it matters.
  const lastSpoken = useRef("");
  useEffect(() => {
    if (screen !== "session" && screen !== "result") return;
    const text = displayMessage(controller);
    if (text && text !== lastSpoken.current) {
      lastSpoken.current = text;
      speech.say(text, "instruction");
    }
  }, [controller, screen, speech]);

  // Completion only comes from the controller (a verified match on the last step).
  useEffect(() => {
    if (controller.status === "done" && screen === "session") setScreen("result");
  }, [controller.status, screen]);

  // Move focus to the new screen's heading for screen-reader users.
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    mainRef.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [screen]);

  const goHome = () => {
    speech.cancel();
    controller.reset();
    lastSpoken.current = "";
    setApplianceId(null);
    setScreen("home");
  };

  return (
    <main ref={mainRef} className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <AppHeader onHome={screen === "home" ? undefined : goHome} />
      {mode.live ? (
        <p className="rounded-2xl bg-good-bg px-4 py-2 text-base font-bold text-good">
          Live mode: the camera reads the real panel.
        </p>
      ) : (
        <p className="rounded-2xl bg-warn-bg px-4 py-2 text-base font-bold text-warn">
          Demo mode: results are simulated, not read from the panel.
        </p>
      )}

      {screen === "home" && mode.live && <DemoAccess />}

      {screen === "home" && (!mode.live || mode.hasToken) && (
        <HomeScreen
          appliances={APPLIANCES}
          onChoose={(id) => {
            speech.unlock(); // this tap lets iOS play speech later
            setApplianceId(id);
            setScreen("routine");
          }}
        />
      )}

      {screen === "routine" && appliance && (
        <RoutineScreen
          appliance={appliance}
          onBack={goHome}
          onChoose={(routineId) => {
            speech.unlock();
            lastSpoken.current = "";
            controller.selectRoutine(appliance.id, routineId);
            setScreen("session");
          }}
        />
      )}

      {screen === "session" && (
        <SessionScreen
          controller={controller}
          speech={speech}
          onExit={() => {
            speech.cancel();
            controller.reset();
            setScreen(appliance ? "routine" : "home");
          }}
        />
      )}

      {screen === "result" && (
        <ResultScreen
          controller={controller}
          onAgain={() => {
            if (!controller.appliance || !controller.routine) return goHome();
            lastSpoken.current = "";
            controller.selectRoutine(controller.appliance.id, controller.routine.id);
            setScreen("session");
          }}
          onHome={goHome}
        />
      )}
    </main>
  );
}
