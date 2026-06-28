"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

type Team = {
  name: string;
  code: string;
  flag: string;
};

type Picks = Record<string, string>;
type Scores = Record<string, { team1: string; team2: string }>;

type Match = {
  id: string;
  team1?: Team;
  team2?: Team;
  label?: string;
};

type SharePayload = {
  name: string;
  picks: Picks;
  scores: Scores;
};

type Rankings = {
  champion?: Team;
  runnerUp?: Team;
  third?: Team;
  fourth?: Team;
};

function makeTeam(name: string, code: string, flagFile: string): Team {
  return { name, code, flag: `/flags/${flagFile}` };
}

const T = {
  germany: makeTeam("Germany", "de", "germany.svg"),
  paraguay: makeTeam("Paraguay", "py", "paraguay.svg"),
  france: makeTeam("France", "fr", "france.svg"),
  sweden: makeTeam("Sweden", "se", "sweden.svg"),
  southAfrica: makeTeam("South Africa", "za", "south-africa.svg"),
  canada: makeTeam("Canada", "ca", "canada.svg"),
  netherlands: makeTeam("Netherlands", "nl", "netherlands.svg"),
  morocco: makeTeam("Morocco", "ma", "morocco.svg"),
  portugal: makeTeam("Portugal", "pt", "portugal.svg"),
  croatia: makeTeam("Croatia", "hr", "croatia.svg"),
  spain: makeTeam("Spain", "es", "spain.svg"),
  austria: makeTeam("Austria", "at", "austria.svg"),
  usa: makeTeam("USA", "us", "usa.svg"),
  bosnia: makeTeam("Bosnia & Herzegovina", "ba", "bosnia.svg"),
  belgium: makeTeam("Belgium", "be", "belgium.svg"),
  senegal: makeTeam("Senegal", "sn", "senegal.svg"),
  brazil: makeTeam("Brazil", "br", "brazil.svg"),
  japan: makeTeam("Japan", "jp", "japan.svg"),
  ivoryCoast: makeTeam("Ivory Coast", "ci", "ivory-coast.svg"),
  norway: makeTeam("Norway", "no", "norway.svg"),
  mexico: makeTeam("Mexico", "mx", "mexico.svg"),
  ecuador: makeTeam("Ecuador", "ec", "ecuador.svg"),
  england: makeTeam("England", "eng", "england.svg"),
  congo: makeTeam("Congo DR", "cd", "dr-congo.svg"),
  argentina: makeTeam("Argentina", "ar", "argentina.svg"),
  capeVerde: makeTeam("Cape Verde", "cv", "cape-verde.svg"),
  australia: makeTeam("Australia", "au", "australia.svg"),
  egypt: makeTeam("Egypt", "eg", "egypt.svg"),
  switzerland: makeTeam("Switzerland", "ch", "switzerland.svg"),
  algeria: makeTeam("Algeria", "dz", "algeria.svg"),
  colombia: makeTeam("Colombia", "co", "colombia.svg"),
  ghana: makeTeam("Ghana", "gh", "ghana.svg"),
};

const round32: Match[] = [
  { id: "m1", team1: T.germany, team2: T.paraguay },
  { id: "m2", team1: T.france, team2: T.sweden },
  { id: "m3", team1: T.southAfrica, team2: T.canada },
  { id: "m4", team1: T.netherlands, team2: T.morocco },
  { id: "m5", team1: T.portugal, team2: T.croatia },
  { id: "m6", team1: T.spain, team2: T.austria },
  { id: "m7", team1: T.usa, team2: T.bosnia },
  { id: "m8", team1: T.belgium, team2: T.senegal },
  { id: "m9", team1: T.brazil, team2: T.japan },
  { id: "m10", team1: T.ivoryCoast, team2: T.norway },
  { id: "m11", team1: T.mexico, team2: T.ecuador },
  { id: "m12", team1: T.england, team2: T.congo },
  { id: "m13", team1: T.argentina, team2: T.capeVerde },
  { id: "m14", team1: T.australia, team2: T.egypt },
  { id: "m15", team1: T.switzerland, team2: T.algeria },
  { id: "m16", team1: T.colombia, team2: T.ghana },
];

const roundLabels = ["Round of 32", "Round of 16", "Quarterfinal", "Semifinal", "Finals", "Podium"];

const desktopRows = {
  round32: Array.from({ length: 16 }, (_, index) => ({ start: index + 1, span: 1 })),
  round16: [1, 3, 5, 7, 9, 11, 13, 15].map((start) => ({ start, span: 2 })),
  qf: [2, 6, 10, 14].map((start) => ({ start, span: 2 })),
  sf: [4, 12].map((start) => ({ start, span: 4 })),
  final: [{ start: 7, span: 2 }],
  third: [{ start: 10, span: 2 }],
  podium: [{ start: 7, span: 5 }],
};

const matchIds = Array.from({ length: 32 }, (_, index) => `m${index + 1}`);

function validPick(picks: Picks, id: string, team1?: Team, team2?: Team) {
  const pickedCode = picks[id];
  if (!pickedCode) return undefined;
  if (team1?.code === pickedCode) return team1;
  if (team2?.code === pickedCode) return team2;
  return undefined;
}

function loserOf(picks: Picks, id: string, team1?: Team, team2?: Team) {
  const winner = validPick(picks, id, team1, team2);
  if (!winner || !team1 || !team2) return undefined;
  return winner.code === team1.code ? team2 : team1;
}

function encodePayload(payload: SharePayload) {
  const namePart = encodeURIComponent(payload.name.trim()).replace(/%20/g, "+");

  const pickPart = matchIds
    .map((id) => payload.picks[id] || "_")
    .join(".");

  const scorePart = matchIds
    .map((id) => {
      const score = payload.scores[id];
      return `${score?.team1 || "_"}-${score?.team2 || "_"}`;
    })
    .join(".");

  return `${namePart}~${pickPart}~${scorePart}`;
}

function decodePayload(value: string): SharePayload | null {
  try {
    const [namePart = "", pickPart = "", scorePart = ""] = value.split("~");
    const pickTokens = pickPart.split(".");
    const scoreTokens = scorePart.split(".");

    const picks: Picks = {};
    const scores: Scores = {};

    matchIds.forEach((id, index) => {
      const pick = pickTokens[index];
      if (pick && pick !== "_") {
        picks[id] = pick;
      }

      const [team1 = "", team2 = ""] = (scoreTokens[index] || "").split("-");
      if (team1 || team2) {
        scores[id] = {
          team1: team1 === "_" ? "" : team1,
          team2: team2 === "_" ? "" : team2,
        };
      }
    });

    return {
      name: decodeURIComponent(namePart.replace(/\+/g, "%20")),
      picks,
      scores,
    };
  } catch {
    return null;
  }
}

function Crest() {
  return (
    <div className="crest" aria-label="World Cup Knockouts">
      <span>WC</span>
    </div>
  );
}

function TrophyArt({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? "trophy-art trophy-art-small" : "trophy-art"}>
      <img src="/trophy.png" alt="World Cup style trophy" className="trophy-photo" />
    </div>
  );
}

function TrophySection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rotateY = useTransform(scrollYProgress, [0, 1], [-10, 10]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [4, -4]);
  const y = useTransform(scrollYProgress, [0, 1], [18, -18]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.98, 1.02, 0.98]);

  return (
    <section ref={sectionRef} className="trophy-section">
      <div className="trophy-panel glass-panel">
        <motion.div className="trophy-wrap" style={{ rotateY, rotateX, y, scale }}>
          <div className="trophy-ring" />
          <TrophyArt />
        </motion.div>
        <div className="trophy-copy">
          <h1>World Cup Knockouts</h1>
          <a href="#bracket" className="jump-button">Bracket</a>
        </div>
      </div>
    </section>
  );
}

function TeamFlag({ team }: { team?: Team }) {
  if (!team) return <span className="podium-flag empty-flag" />;
  return (
    <span className="podium-flag">
      <img src={team.flag} alt={team.name} />
    </span>
  );
}

function PodiumSection({
  rankings,
  name,
  onMakePredictions,
}: {
  rankings: Rankings;
  name: string;
  onMakePredictions?: () => void;
}) {
  const rows = [
    { label: "Champion", rank: "1", team: rankings.champion, className: "podium-row champion-row" },
    { label: "Runner-up", rank: "2", team: rankings.runnerUp, className: "podium-row" },
    { label: "3rd Place", rank: "3", team: rankings.third, className: "podium-row" },
    { label: "4th Place", rank: "4", team: rankings.fourth, className: "podium-row" },
  ];

  return (
    <section className="share-hero">
      <div className="podium-panel glass-panel">
        <div className="podium-title">
          <Crest />
          <div>
            <p>{name ? `${name}'s predictions` : "Predictions"}</p>
            <h1>World Cup Knockouts</h1>
          </div>
        </div>

        <div className="podium-list">
          {rows.map((row) => (
            <div key={row.label} className={row.className}>
              <span className="rank-number">{row.rank}</span>
              <TeamFlag team={row.team} />
              <strong>{row.team?.name || "—"}</strong>
              <span>{row.label}</span>
            </div>
          ))}
        </div>

        <div className="podium-actions">
          <a href="#bracket" className="secondary-button">Bracket</a>
          {onMakePredictions ? (
            <button type="button" onClick={onMakePredictions} className="primary-button">
              Make your predictions
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MatchCard({
  match,
  picks,
  scores,
  setPick,
  updateScore,
  readOnly = false,
}: {
  match: Match;
  picks: Picks;
  scores: Scores;
  setPick: (id: string, team: Team) => void;
  updateScore: (match: Match, side: "team1" | "team2", value: string) => void;
  readOnly?: boolean;
}) {
  const picked = validPick(picks, match.id, match.team1, match.team2);
  const score = scores[match.id] || { team1: "", team2: "" };
  const hasFullScore = score.team1 !== "" && score.team2 !== "";
  const isDraw = hasFullScore && Number(score.team1) === Number(score.team2);
  const lockWinnerChoice = readOnly || (hasFullScore && !isDraw);

  const teams = [
    { team: match.team1, side: "team1" as const, score: score.team1 },
    { team: match.team2, side: "team2" as const, score: score.team2 },
  ];

  return (
    <article className="match-card">
      {match.label ? <div className="match-label">{match.label}</div> : null}

      <div className="team-stack">
        {teams.map(({ team, side, score: teamScore }) => {
          const isPicked = picked?.code === team?.code;
          const isWaiting = !team;

          return (
            <div key={side} className="team-row">
              <button
                type="button"
                disabled={isWaiting || lockWinnerChoice}
                onClick={() => team && setPick(match.id, team)}
                className={`flag-button ${isPicked ? "is-picked" : ""} ${isWaiting ? "is-waiting" : ""}`}
              >
                {team ? (
                  <>
                    <span className="flag-media">
                      <img src={team.flag} alt={team.name} className="flag-image" />
                    </span>
                    <span className="flag-overlay" />
                    <span className="flag-label">{team.name}</span>
                    {isDraw && isPicked ? <span className="flag-badge">Pens</span> : null}
                  </>
                ) : (
                  <span className="waiting-label">Waiting</span>
                )}
              </button>

              <input
                value={teamScore}
                onChange={(event) => updateScore(match, side, event.target.value)}
                inputMode="numeric"
                className="score-box"
                placeholder="0"
                disabled={isWaiting || readOnly}
              />
            </div>
          );
        })}
      </div>
    </article>
  );
}

function PodiumCard({ rankings }: { rankings: Rankings }) {
  return (
    <article className="champion-card">
      <TrophyArt small />
      <div className="mini-podium-list">
        <p><span>1</span>{rankings.champion?.name || "—"}</p>
        <p><span>2</span>{rankings.runnerUp?.name || "—"}</p>
        <p><span>3</span>{rankings.third?.name || "—"}</p>
      </div>
    </article>
  );
}

function DesktopBracket({
  rounds,
  picks,
  scores,
  setPick,
  updateScore,
  rankings,
  readOnly,
}: {
  rounds: { r32: Match[]; r16: Match[]; qf: Match[]; sf: Match[]; final: Match[]; third: Match[] };
  picks: Picks;
  scores: Scores;
  setPick: (id: string, team: Team) => void;
  updateScore: (match: Match, side: "team1" | "team2", value: string) => void;
  rankings: Rankings;
  readOnly: boolean;
}) {
  return (
    <div className="desktop-bracket">
      <div className="desktop-headings">
        {roundLabels.map((label) => <div key={label} className="round-heading">{label}</div>)}
      </div>

      <div className="desktop-grid-wrap">
        <div className="desktop-grid">
          {rounds.r32.map((match, index) => {
            const pos = desktopRows.round32[index];
            return <div key={match.id} className="grid-slot" style={{ gridColumn: 1, gridRow: `${pos.start} / span ${pos.span}` }}><MatchCard match={match} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} readOnly={readOnly} /></div>;
          })}
          {rounds.r16.map((match, index) => {
            const pos = desktopRows.round16[index];
            return <div key={match.id} className="grid-slot center-slot" style={{ gridColumn: 2, gridRow: `${pos.start} / span ${pos.span}` }}><MatchCard match={match} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} readOnly={readOnly} /></div>;
          })}
          {rounds.qf.map((match, index) => {
            const pos = desktopRows.qf[index];
            return <div key={match.id} className="grid-slot center-slot" style={{ gridColumn: 3, gridRow: `${pos.start} / span ${pos.span}` }}><MatchCard match={match} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} readOnly={readOnly} /></div>;
          })}
          {rounds.sf.map((match, index) => {
            const pos = desktopRows.sf[index];
            return <div key={match.id} className="grid-slot center-slot" style={{ gridColumn: 4, gridRow: `${pos.start} / span ${pos.span}` }}><MatchCard match={match} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} readOnly={readOnly} /></div>;
          })}
          {rounds.final.map((match) => {
            const pos = desktopRows.final[0];
            return <div key={match.id} className="grid-slot center-slot" style={{ gridColumn: 5, gridRow: `${pos.start} / span ${pos.span}` }}><MatchCard match={match} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} readOnly={readOnly} /></div>;
          })}
          {rounds.third.map((match) => {
            const pos = desktopRows.third[0];
            return <div key={match.id} className="grid-slot center-slot" style={{ gridColumn: 5, gridRow: `${pos.start} / span ${pos.span}` }}><MatchCard match={match} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} readOnly={readOnly} /></div>;
          })}
          <div className="grid-slot center-slot" style={{ gridColumn: 6, gridRow: `${desktopRows.podium[0].start} / span ${desktopRows.podium[0].span}` }}><PodiumCard rankings={rankings} /></div>
        </div>
      </div>
    </div>
  );
}

function MobileBracket({
  rounds,
  picks,
  scores,
  setPick,
  updateScore,
  rankings,
  readOnly,
}: {
  rounds: { r32: Match[]; r16: Match[]; qf: Match[]; sf: Match[]; final: Match[]; third: Match[] };
  picks: Picks;
  scores: Scores;
  setPick: (id: string, team: Team) => void;
  updateScore: (match: Match, side: "team1" | "team2", value: string) => void;
  rankings: Rankings;
  readOnly: boolean;
}) {
  const sections = [
    { title: "Round of 32", matches: rounds.r32 },
    { title: "Round of 16", matches: rounds.r16 },
    { title: "Quarterfinal", matches: rounds.qf },
    { title: "Semifinal", matches: rounds.sf },
    { title: "Finals", matches: [...rounds.final, ...rounds.third] },
  ];

  return (
    <div className="mobile-bracket">
      {sections.map((section) => (
        <section key={section.title} className="mobile-round">
          <h3>{section.title}</h3>
          <div className="mobile-round-list">
            {section.matches.map((match) => <MatchCard key={match.id} match={match} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} readOnly={readOnly} />)}
          </div>
        </section>
      ))}
      <section className="mobile-round">
        <h3>Podium</h3>
        <PodiumCard rankings={rankings} />
      </section>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<"build" | "shared">("build");
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState("");
  const [picks, setPicks] = useState<Picks>({});
  const [scores, setScores] = useState<Scores>({});
  const [shareCopied, setShareCopied] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadPage() {
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get("id");
      const legacyShareValue = params.get("p");

      if (shareId) {
        try {
          const response = await fetch(`/api/predictions?id=${encodeURIComponent(shareId)}`);

          if (response.ok) {
            const sharedPayload = await response.json() as SharePayload;
            setName(sharedPayload.name || "");
            setPicks(sharedPayload.picks || {});
            setScores(sharedPayload.scores || {});
            setMode("shared");
            setHydrated(true);
            return;
          }
        } catch {
          // Fall through to local bracket.
        }
      }

      const legacyPayload = legacyShareValue ? decodePayload(legacyShareValue) : null;

      if (legacyPayload) {
        setName(legacyPayload.name || "");
        setPicks(legacyPayload.picks || {});
        setScores(legacyPayload.scores || {});
        setMode("shared");
        setHydrated(true);
        return;
      }

      setName(localStorage.getItem("wck-name") || "");

      const savedPicks = localStorage.getItem("wck-picks");
      const savedScores = localStorage.getItem("wck-scores");

      if (savedPicks) setPicks(JSON.parse(savedPicks));
      if (savedScores) setScores(JSON.parse(savedScores));

      setHydrated(true);
    }

    loadPage();
  }, []);

  useEffect(() => {
    if (!hydrated || mode !== "build") return;
    localStorage.setItem("wck-name", name);
  }, [name, hydrated, mode]);

  useEffect(() => {
    if (!hydrated || mode !== "build") return;
    localStorage.setItem("wck-picks", JSON.stringify(picks));
  }, [picks, hydrated, mode]);

  useEffect(() => {
    if (!hydrated || mode !== "build") return;
    localStorage.setItem("wck-scores", JSON.stringify(scores));
  }, [scores, hydrated, mode]);

  function setPick(id: string, team: Team) {
    setPicks((current) => ({ ...current, [id]: team.code }));
  }

  function updateScore(match: Match, side: "team1" | "team2", value: string) {
    const cleanValue = value.replace(/[^0-9]/g, "").slice(0, 2);
    const currentScore = scores[match.id] || { team1: "", team2: "" };
    const nextScore = { ...currentScore, [side]: cleanValue };

    setScores((current) => ({ ...current, [match.id]: nextScore }));

    if (!match.team1 || !match.team2) return;
    if (nextScore.team1 === "" || nextScore.team2 === "") return;

    const team1Score = Number(nextScore.team1);
    const team2Score = Number(nextScore.team2);

    if (team1Score > team2Score) {
      setPicks((current) => ({ ...current, [match.id]: match.team1!.code }));
      return;
    }

    if (team2Score > team1Score) {
      setPicks((current) => ({ ...current, [match.id]: match.team2!.code }));
      return;
    }

    setPicks((current) => {
      const next = { ...current };
      delete next[match.id];
      return next;
    });
  }

  function resetBracket() {
    if (!confirm("Reset your bracket?")) return;
    setPicks({});
    setScores({});
    localStorage.removeItem("wck-picks");
    localStorage.removeItem("wck-scores");
  }

  const rounds = useMemo(() => {
    const r16: Match[] = [
      { id: "m17", team1: validPick(picks, "m1", round32[0].team1, round32[0].team2), team2: validPick(picks, "m2", round32[1].team1, round32[1].team2) },
      { id: "m18", team1: validPick(picks, "m3", round32[2].team1, round32[2].team2), team2: validPick(picks, "m4", round32[3].team1, round32[3].team2) },
      { id: "m19", team1: validPick(picks, "m5", round32[4].team1, round32[4].team2), team2: validPick(picks, "m6", round32[5].team1, round32[5].team2) },
      { id: "m20", team1: validPick(picks, "m7", round32[6].team1, round32[6].team2), team2: validPick(picks, "m8", round32[7].team1, round32[7].team2) },
      { id: "m21", team1: validPick(picks, "m9", round32[8].team1, round32[8].team2), team2: validPick(picks, "m10", round32[9].team1, round32[9].team2) },
      { id: "m22", team1: validPick(picks, "m11", round32[10].team1, round32[10].team2), team2: validPick(picks, "m12", round32[11].team1, round32[11].team2) },
      { id: "m23", team1: validPick(picks, "m13", round32[12].team1, round32[12].team2), team2: validPick(picks, "m14", round32[13].team1, round32[13].team2) },
      { id: "m24", team1: validPick(picks, "m15", round32[14].team1, round32[14].team2), team2: validPick(picks, "m16", round32[15].team1, round32[15].team2) },
    ];

    const qf: Match[] = [
      { id: "m25", team1: validPick(picks, "m17", r16[0].team1, r16[0].team2), team2: validPick(picks, "m18", r16[1].team1, r16[1].team2) },
      { id: "m26", team1: validPick(picks, "m19", r16[2].team1, r16[2].team2), team2: validPick(picks, "m20", r16[3].team1, r16[3].team2) },
      { id: "m27", team1: validPick(picks, "m21", r16[4].team1, r16[4].team2), team2: validPick(picks, "m22", r16[5].team1, r16[5].team2) },
      { id: "m28", team1: validPick(picks, "m23", r16[6].team1, r16[6].team2), team2: validPick(picks, "m24", r16[7].team1, r16[7].team2) },
    ];

    const sf: Match[] = [
      { id: "m29", team1: validPick(picks, "m25", qf[0].team1, qf[0].team2), team2: validPick(picks, "m26", qf[1].team1, qf[1].team2) },
      { id: "m30", team1: validPick(picks, "m27", qf[2].team1, qf[2].team2), team2: validPick(picks, "m28", qf[3].team1, qf[3].team2) },
    ];

    const final: Match[] = [
      { id: "m31", label: "Final", team1: validPick(picks, "m29", sf[0].team1, sf[0].team2), team2: validPick(picks, "m30", sf[1].team1, sf[1].team2) },
    ];

    const third: Match[] = [
      { id: "m32", label: "3rd Place", team1: loserOf(picks, "m29", sf[0].team1, sf[0].team2), team2: loserOf(picks, "m30", sf[1].team1, sf[1].team2) },
    ];

    return { r32: round32, r16, qf, sf, final, third };
  }, [picks]);

  const rankings = useMemo<Rankings>(() => {
    const champion = validPick(picks, "m31", rounds.final[0].team1, rounds.final[0].team2);
    const runnerUp = loserOf(picks, "m31", rounds.final[0].team1, rounds.final[0].team2);
    const third = validPick(picks, "m32", rounds.third[0].team1, rounds.third[0].team2);
    const fourth = loserOf(picks, "m32", rounds.third[0].team1, rounds.third[0].team2);
    return { champion, runnerUp, third, fourth };
  }, [picks, rounds]);

  const isComplete = Boolean(rankings.champion && rankings.runnerUp && rankings.third && rankings.fourth);

  function makeOwnPredictions() {
    window.history.replaceState(null, "", window.location.pathname);
    localStorage.removeItem("wck-picks");
    localStorage.removeItem("wck-scores");
    setMode("build");
    setName("");
    setPicks({});
    setScores({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function sharePredictions() {
    if (!isComplete) return;

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, picks, scores }),
      });

      if (!response.ok) {
        throw new Error("Unable to save prediction");
      }

      const { id } = await response.json() as { id: string };
      const shareUrl = new URL(window.location.href);
      shareUrl.search = "";
      shareUrl.searchParams.set("id", id);

      const url = shareUrl.toString();
      const shareText = `Here are my World Cup knockout predictions:
${rankings.champion?.name} wins 🏆`;
      const copyText = `${shareText}

Make yours:
${url}`;

      if (navigator.share) {
        await navigator.share({
          title: "World Cup Knockouts",
          text: shareText,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(copyText);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      alert("Could not create a share link yet. Check the KV setup on Vercel.");
    }
  }

  return (
    <main className="page-shell">
      <div className="top-shell">
        {mode === "shared" ? (
          <PodiumSection rankings={rankings} name={name} onMakePredictions={makeOwnPredictions} />
        ) : (
          <TrophySection />
        )}

        <section className="top-bar glass-panel">
          <div className="top-bar-title">
            <Crest />
            <h2>World Cup Knockouts</h2>
          </div>

          {mode === "shared" ? (
            <button type="button" onClick={makeOwnPredictions} className="primary-button">
              Make your predictions
            </button>
          ) : (
            <div className="top-bar-actions">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="name-input" />
              <button type="button" onClick={sharePredictions} disabled={!isComplete} className="primary-button">
                {shareCopied ? "Copied" : "Share predictions"}
              </button>
              <button type="button" onClick={resetBracket} className="secondary-button">Reset</button>
            </div>
          )}
        </section>
      </div>

      <section id="bracket" className="board-section">
        <div ref={boardRef} className="board-panel glass-panel">
          <div className="board-header">
            <h2>{name ? `${name}'s Knockouts` : "World Cup Knockouts"}</h2>
            {rankings.champion ? <span className="champion-pill">{rankings.champion.name}</span> : null}
          </div>

          <div className="board-desktop">
            <DesktopBracket rounds={rounds} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} rankings={rankings} readOnly={mode === "shared"} />
          </div>

          <div className="board-mobile">
            <MobileBracket rounds={rounds} picks={picks} scores={scores} setPick={setPick} updateScore={updateScore} rankings={rankings} readOnly={mode === "shared"} />
          </div>
        </div>
      </section>
    </main>
  );
}
