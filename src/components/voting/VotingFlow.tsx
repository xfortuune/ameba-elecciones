"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cancelVoterSessionAction, submitRunoffVoteAction, submitVoteAction } from "@/app/actions";
import type { ElectionStatus, VoterStatus } from "@/lib/election";
import { Alert } from "../Alert";
import { Progress } from "../Progress";
import { BallotPaper, type Picks } from "./BallotPaper";
import { BallotReview } from "./BallotReview";
import { EASTER_EGGS, EasterEgg } from "./EasterEggs";
import { NamePicker } from "./NamePicker";
import { PinStep } from "./PinStep";
import { RunoffBallot } from "./RunoffBallot";
import { ScheduleBanner } from "./ScheduleBanner";
import { VoteCast } from "./VoteCast";

type Step =
  | { kind: "choose" }
  | { kind: "pin"; voter: VoterStatus }
  | { kind: "ballot"; voter: VoterStatus }
  | { kind: "review"; voter: VoterStatus }
  | { kind: "runoff"; voter: VoterStatus }
  | { kind: "done"; voter: VoterStatus; runoff?: boolean };

const emptyPicks: Picks = { 3: null, 2: null, 1: null };

export function VotingFlow({ status }: { status: ElectionStatus }) {
  const router = useRouter();
  const { voters } = status;
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [picks, setPicks] = useState<Picks>(emptyPicks);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Easter egg pendiente de mostrar (nombre del votante), ver EasterEggs.tsx. */
  const [egg, setEgg] = useState<string | null>(null);
  /** Papeleta dorada: ventaja (solo estética) del modo creador. */
  const [gold, setGold] = useState(false);

  const runoff = status.runoff && !status.runoff.complete ? status.runoff : null;

  // En segunda vuelta, la lista refleja quién ha votado en ella (y los ausentes no votan).
  const listVoters: VoterStatus[] = runoff
    ? voters.map((v) => ({ ...v, hasVoted: v.blank || runoff.votedIds.includes(v.id) }))
    : voters;
  const votedCount = runoff ? runoff.votedIds.length : voters.filter((v) => v.hasVoted).length;
  const totalCount = runoff ? runoff.eligibleIds.length : voters.length;
  const locked = !runoff && !status.votingOpen;

  // En móvil, cada paso empieza arriba del todo.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step.kind]);

  async function backToStart() {
    setStep({ kind: "choose" });
    setPicks(emptyPicks);
    setError(null);
    setEgg(null);
    await cancelVoterSessionAction();
    router.refresh();
  }

  async function handleResult(
    res: { ok: true } | { ok: false; code: string; message: string },
    voter: VoterStatus,
    isRunoff: boolean,
  ) {
    if (res.ok) {
      setStep({ kind: "done", voter, runoff: isRunoff });
      router.refresh();
    } else if (res.code === "no_session") {
      setError(res.message);
      setStep({ kind: "pin", voter });
    } else {
      setError(res.message);
      if (res.code === "already_voted" || res.code === "closed" || res.code === "no_runoff") {
        setStep({ kind: "choose" });
        router.refresh();
      }
    }
  }

  async function submit(voter: VoterStatus) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitVoteAction({ first: picks[3], second: picks[2], third: picks[1] });
      await handleResult(res, voter, false);
    } catch {
      setError("No se ha podido enviar la papeleta. Revisa tu conexión y vuelve a intentarlo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRunoff(voter: VoterStatus, candidateId: number) {
    setSubmitting(true);
    setError(null);
    try {
      await handleResult(await submitRunoffVoteAction(candidateId), voter, true);
    } catch {
      setError("No se ha podido enviar el voto. Revisa tu conexión y vuelve a intentarlo.");
    } finally {
      setSubmitting(false);
    }
  }

  const eggLayer = egg && (
    <EasterEgg
      name={egg}
      onClose={() => setEgg(null)}
      onGold={() => setGold(true)}
      votedCount={status.votedCount}
    />
  );

  switch (step.kind) {
    case "choose":
      return (
        <div className="space-y-6">
          {runoff ? (
            <div className="rounded-sm border-2 border-stamp bg-stamp-soft px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-stamp">⚖️ Segunda vuelta</p>
              <p className="mt-1 font-serif text-lg font-bold">
                Desempate entre {runoff.candidates.map((c) => c.name).join(" y ")}
              </p>
              <p className="text-sm text-ink-soft">Entra con tu PIN y elige a uno de ellos.</p>
            </div>
          ) : (
            <ScheduleBanner status={status} />
          )}
          <Progress voted={votedCount} total={totalCount} />
          {error && <Alert>{error}</Alert>}
          <NamePicker
            voters={listVoters}
            locked={locked}
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
          onSuccess={(mode) => {
            setError(null);
            setStep({ kind: mode === "runoff" ? "runoff" : "ballot", voter: step.voter });
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
          {eggLayer}
          <BallotPaper
            voter={step.voter}
            candidates={voters.filter((v) => v.id !== step.voter.id)}
            picks={picks}
            onChange={setPicks}
            gold={gold}
            onCancel={backToStart}
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
          gold={gold}
          onEdit={() => {
            setError(null);
            setStep({ kind: "ballot", voter: step.voter });
          }}
          onConfirm={() => submit(step.voter)}
        />
      );

    case "runoff":
      return (
        <>
          {eggLayer}
          <RunoffBallot
            voter={step.voter}
            candidates={(status.runoff?.candidates ?? []).filter((c) => c.id !== step.voter.id)}
            error={error}
            submitting={submitting}
            gold={gold}
            onCancel={backToStart}
            onConfirm={(id) => submitRunoff(step.voter, id)}
          />
        </>
      );

    case "done":
      return <VoteCast voter={step.voter} runoff={step.runoff} />;
  }
}
