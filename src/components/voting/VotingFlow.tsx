"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cancelVoterSessionAction, submitVoteAction } from "@/app/actions";
import type { VoterStatus } from "@/lib/election";
import { Alert } from "../Alert";
import { Banner } from "../Banner";
import { Progress } from "../Progress";
import { BallotPaper, type Picks } from "./BallotPaper";
import { BallotReview } from "./BallotReview";
import { EASTER_EGGS } from "./EasterEggs";
import { NamePicker } from "./NamePicker";
import { PinStep } from "./PinStep";
import { VoteCast } from "./VoteCast";

type Step =
  | { kind: "choose" }
  | { kind: "pin"; voter: VoterStatus }
  | { kind: "ballot"; voter: VoterStatus }
  | { kind: "review"; voter: VoterStatus }
  | { kind: "done"; voter: VoterStatus };

const emptyPicks: Picks = { 3: null, 2: null, 1: null };


export function VotingFlow({ voters }: { voters: VoterStatus[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [picks, setPicks] = useState<Picks>(emptyPicks);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Easter egg pendiente de mostrar (nombre del votante), ver EasterEggs.tsx. */
  const [egg, setEgg] = useState<string | null>(null);

  const votedCount = voters.filter((v) => v.hasVoted).length;

  // En móvil, cada paso empieza arriba del todo.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step.kind]);

  async function backToStart() {
    setStep({ kind: "choose" });
    setPicks(emptyPicks);
    setError(null);
    await cancelVoterSessionAction();
    router.refresh();
  }

  async function submit(voter: VoterStatus) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitVoteAction({ first: picks[3], second: picks[2], third: picks[1] });
      if (res.ok) {
        setStep({ kind: "done", voter });
        router.refresh();
      } else if (res.code === "no_session") {
        setError(res.message);
        setStep({ kind: "pin", voter });
      } else {
        setError(res.message);
        if (res.code === "already_voted") {
          setStep({ kind: "choose" });
          router.refresh();
        }
      }
    } catch {
      setError("No se ha podido enviar la papeleta. Revisa tu conexión y vuelve a intentarlo.");
    } finally {
      setSubmitting(false);
    }
  }

  switch (step.kind) {
    case "choose":
      return (
        <div className="space-y-6">
          <div className="flex justify-center">
            <Banner className="animate-sway h-auto w-36 drop-shadow-md sm:w-44" />
          </div>
          <Progress voted={votedCount} total={voters.length} />
          {error && <Alert>{error}</Alert>}
          <NamePicker
            voters={voters}
            onPick={(voter) => {
              setError(null);
              setStep({ kind: "pin", voter });
            }}
          />
        </div>
      );

    case "pin":
      return (
        <PinStep
          voter={step.voter}
          notice={error}
          onBack={backToStart}
          onSuccess={() => {
            setError(null);
            setStep({ kind: "ballot", voter: step.voter });
            if (EASTER_EGGS[step.voter.name]) setEgg(step.voter.name);
          }}
          onAlreadyVoted={() => {
            setStep({ kind: "choose" });
            router.refresh();
          }}
        />
      );

    case "ballot":
      return (
        <>
          {egg && EASTER_EGGS[egg]?.({ onClose: () => setEgg(null) })}
          <BallotPaper
            voter={step.voter}
            candidates={voters.filter((v) => v.id !== step.voter.id)}
            picks={picks}
            onChange={setPicks}
            onCancel={() => {
              setEgg(null);
              backToStart();
            }}
            onNext={() => setStep({ kind: "review", voter: step.voter })}
          />
        </>
      );

    case "review":
      return (
        <BallotReview
          voter={step.voter}
          picks={picks}
          names={Object.fromEntries(voters.map((v) => [v.id, v.name]))}
          error={error}
          submitting={submitting}
          onEdit={() => {
            setError(null);
            setStep({ kind: "ballot", voter: step.voter });
          }}
          onConfirm={() => submit(step.voter)}
        />
      );

    case "done":
      return <VoteCast voter={step.voter} />;
  }
}

