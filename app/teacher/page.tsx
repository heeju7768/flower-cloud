"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

type FlowerEntry = {
  id: string;
  order: number;
  studentName: string;
  flowerName: string;
  createdAt: string;
  count: number;
  colorType: number;
  shapeType: number;
};

type FlowerGroup = {
  flowerName: string;
  count: number;
  studentNames: string[];
  firstOrder: number;
  colorType: number;
  shapeType: number;
};

const pastelColors = ["#F8AFC2", "#FFD966", "#9EDBF2", "#C8B6EA", "#BFE7A8", "#FFC49B"];

function hashText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fallbackStyle(flowerName: string) {
  const hash = hashText(flowerName);
  return {
    colorType: hash % pastelColors.length,
    shapeType: (hash % 3) + 1
  };
}

function groupFlowers(entries: FlowerEntry[]) {
  const grouped = new Map<string, FlowerGroup>();

  entries.forEach(entry => {
    const fallback = fallbackStyle(entry.flowerName);
    if (!grouped.has(entry.flowerName)) {
      grouped.set(entry.flowerName, {
        flowerName: entry.flowerName,
        count: entry.count,
        studentNames: [],
        firstOrder: entry.order,
        colorType: entry.colorType ?? fallback.colorType,
        shapeType: entry.shapeType ?? fallback.shapeType
      });
    }

    const group = grouped.get(entry.flowerName);
    if (!group) return;
    if (!group.studentNames.includes(entry.studentName)) group.studentNames.push(entry.studentName);
    group.count = Math.max(group.count, entry.count || 1);
  });

  return [...grouped.values()].sort((a, b) => a.firstOrder - b.firstOrder);
}

function positionFor(group: FlowerGroup, index: number) {
  const hash = hashText(`${group.flowerName}-${group.firstOrder}`);
  const columns = typeof window !== "undefined" && window.innerWidth < 640 ? 3 : 5;
  const row = Math.floor(index / columns);
  const col = index % columns;
  const baseX = ((col + 0.5) / columns) * 100;
  const baseY = 17 + row * 20;

  return {
    x: Math.max(12, Math.min(88, baseX + (hash % 13) - 6)),
    y: Math.max(16, Math.min(86, baseY + ((hash >> 3) % 9) - 4))
  };
}

function formatDateForFile() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function downloadFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function petalSettings(shapeType: number) {
  if (shapeType === 2) return { count: 10, rx: 17, ry: 43, cy: -52 };
  if (shapeType === 3) return { count: 12, rx: 11, ry: 30, cy: -45 };
  return { count: 8, rx: 24, ry: 34, cy: -48 };
}

function wrapFlowerName(name: string) {
  if (name.length <= 5) return [name];
  return [name.slice(0, 5), name.slice(5, 10)].filter(Boolean);
}

function FlowerCard({
  group,
  color,
  isHighlighted,
  onClick,
  style
}: {
  group: FlowerGroup;
  color: string;
  isHighlighted: boolean;
  onClick: () => void;
  style: CSSProperties & Record<string, string | number>;
}) {
  const petals = petalSettings(group.shapeType);
  const flowerNameLines = wrapFlowerName(group.flowerName);
  const studentName = group.studentNames.slice(0, 4).join(", ");
  const darkStroke = "rgba(70, 45, 35, 0.18)";

  return (
    <button
      type="button"
      className={`flower-card${isHighlighted ? " is-highlighted" : ""}`}
      style={style}
      aria-label={`${group.flowerName}, ${group.count}번 피었습니다`}
      onClick={onClick}
    >
      <svg className="flower-illustration" viewBox="0 0 200 260" role="img" aria-label={`${group.flowerName} 꽃`}>
        <g transform="translate(100 90)">
          {Array.from({ length: petals.count }).map((_, index) => (
            <ellipse
              key={index}
              cx="0"
              cy={petals.cy}
              rx={petals.rx}
              ry={petals.ry}
              fill={color}
              stroke={darkStroke}
              strokeWidth="2"
              transform={`rotate(${(360 / petals.count) * index})`}
            />
          ))}

          <circle
            className={isHighlighted ? "flower-center-circle is-highlighted" : "flower-center-circle"}
            cx="0"
            cy="0"
            r="52"
            fill="#FFFDF4"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="5"
          />

          <text className="flower-text-name" x="0" y={flowerNameLines.length === 1 ? -6 : -18}>
            {flowerNameLines.map((line, index) => (
              <tspan key={line} x="0" dy={index === 0 ? 0 : 24}>
                {line}
              </tspan>
            ))}
          </text>
          <text className="flower-text-student" x="0" y="31">
            {studentName}
          </text>
        </g>

        <rect x="94" y="137" width="12" height="84" rx="6" fill="#70A83F" />
        <ellipse cx="70" cy="176" rx="28" ry="15" fill="#91C957" stroke="#6EA241" strokeWidth="2" transform="rotate(-30 70 176)" />
        <ellipse cx="130" cy="176" rx="28" ry="15" fill="#91C957" stroke="#6EA241" strokeWidth="2" transform="rotate(30 130 176)" />
      </svg>
    </button>
  );
}

function drawFlowerOnCanvas(
  ctx: CanvasRenderingContext2D,
  group: FlowerGroup,
  color: string,
  centerX: number,
  topY: number,
  scale: number
) {
  const petals = petalSettings(group.shapeType);
  ctx.save();
  ctx.translate(centerX, topY + 90 * scale);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#70A83F";
  ctx.beginPath();
  ctx.roundRect(94 - 100, 137 - 90, 12, 84, 6);
  ctx.fill();

  ctx.fillStyle = "#91C957";
  ctx.strokeStyle = "#6EA241";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-30, 86, 28, 15, -0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(30, 86, 28, 15, 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  for (let index = 0; index < petals.count; index += 1) {
    const angle = ((Math.PI * 2) / petals.count) * index;
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(70, 45, 35, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, petals.cy, petals.rx, petals.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = "#FFFDF4";
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#3f2f25";
  ctx.textAlign = "center";
  ctx.font = "900 20px Malgun Gothic, Arial";
  const lines = wrapFlowerName(group.flowerName);
  lines.forEach((line, index) => {
    ctx.fillText(line, 0, (lines.length === 1 ? -6 : -18) + index * 24);
  });
  ctx.fillStyle = "#6b5a4f";
  ctx.font = "700 13px Malgun Gothic, Arial";
  ctx.fillText(group.studentNames.slice(0, 4).join(", "), 0, 31);
  ctx.restore();
}

export default function TeacherPage() {
  const [entries, setEntries] = useState<FlowerEntry[]>([]);
  const [highlightedName, setHighlightedName] = useState("");
  const [studentUrl, setStudentUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [layoutVersion, setLayoutVersion] = useState(0);

  const groups = useMemo(() => groupFlowers(entries), [entries]);

  useEffect(() => {
    setStudentUrl(new URL("/student", window.location.origin).toString());
  }, []);

  useEffect(() => {
    async function refreshFlowers() {
      const response = await fetch("/api/flowers", { cache: "no-store" });
      const data = (await response.json()) as { flowers?: FlowerEntry[] };
      setEntries(data.flowers || []);
    }

    refreshFlowers();
    const events = new EventSource("/api/events");
    events.onmessage = event => {
      const data = JSON.parse(event.data) as { flowers?: FlowerEntry[] };
      setEntries(data.flowers || []);
    };
    events.onerror = () => {
      events.close();
      window.setTimeout(refreshFlowers, 1200);
    };

    return () => events.close();
  }, []);

  useEffect(() => {
    const onResize = () => setLayoutVersion(version => version + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function saveCsv() {
    const rows = [
      ["입력 순서", "학생 이름", "꽃 이름", "같은 꽃 이름의 입력 횟수", "입력 시간"],
      ...entries.map(entry => [
        entry.order,
        entry.studentName,
        entry.flowerName,
        entry.count,
        new Date(entry.createdAt).toLocaleString("ko-KR")
      ])
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadFile(`flower-cloud-${formatDateForFile()}.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
  }

  function saveImage() {
    const cloudArea = document.querySelector(".cloud-area");
    if (!cloudArea) return;

    const rect = cloudArea.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const pixelRatio = 2;
    canvas.width = Math.max(1200, Math.floor(rect.width * pixelRatio));
    canvas.height = Math.max(760, Math.floor(rect.height * pixelRatio));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, "#fff9ed");
    background.addColorStop(1, "#eef8f1");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#544338";
    ctx.textAlign = "center";
    ctx.font = "700 46px Malgun Gothic, Arial";
    ctx.fillText("우리 반 마음꽃", canvas.width / 2, 78);

    groups.forEach((group, index) => {
      const position = positionFor(group, index);
      const scale = Math.min(1.36, 0.78 + group.count * 0.1) * (canvas.width / rect.width);
      const color = pastelColors[group.colorType % pastelColors.length] || pastelColors[0];
      const centerX = (position.x / 100) * canvas.width;
      const topY = (position.y / 100) * canvas.height - 100 * scale;
      drawFlowerOnCanvas(ctx, group, color, centerX, topY, scale);
    });

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flower-cloud-${formatDateForFile()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  async function clearAll() {
    if (!window.confirm("모든 마음꽃을 지울까요?")) return;
    await fetch("/api/flowers", { method: "DELETE" });
  }

  async function copyStudentUrl() {
    try {
      await navigator.clipboard.writeText(studentUrl);
      setCopyMessage("복사되었습니다.");
      window.setTimeout(() => setCopyMessage(""), 1800);
    } catch {
      setCopyMessage("주소를 선택해서 복사해주세요.");
    }
  }

  return (
    <main className="teacher-page">
      <header className="teacher-toolbar">
        <div>
          <p className="story-badge">마음꽃 워드클라우드</p>
          <h1>우리 반 마음꽃</h1>
        </div>
        <nav aria-label="교사 도구">
          <a className="student-link" href={studentUrl || "/student"} target="_blank" rel="noreferrer">
            학생 화면
          </a>
          <button type="button" onClick={saveCsv}>
            결과 저장
          </button>
          <button type="button" onClick={saveImage}>
            화면 이미지 저장
          </button>
          <button className="danger" type="button" onClick={clearAll}>
            전체 지우기
          </button>
        </nav>
      </header>

      <section className="share-strip" aria-label="학생용 배포 주소">
        <label htmlFor="student-url">학생용 배포 주소</label>
        <input id="student-url" type="text" readOnly value={studentUrl} />
        <button type="button" onClick={copyStudentUrl}>
          주소 복사
        </button>
        <span role="status" aria-live="polite">
          {copyMessage}
        </span>
      </section>

      <section className="cloud-area" aria-label="입력된 마음꽃" data-layout={layoutVersion}>
        {groups.length === 0 ? <p className="empty-state">아직 피어난 마음꽃이 없습니다.</p> : null}

        {groups.map((group, index) => {
          const position = positionFor(group, index);
          const scale = Math.min(1.36, 0.78 + group.count * 0.1);
          const rotation = (hashText(`${group.flowerName}-turn`) % 10) - 5;
          const color = pastelColors[group.colorType % pastelColors.length] || pastelColors[0];

          return (
            <FlowerCard
              key={group.flowerName}
              group={group}
              color={color}
              isHighlighted={highlightedName === group.flowerName}
              onClick={() => setHighlightedName(highlightedName === group.flowerName ? "" : group.flowerName)}
              style={
                {
                  "--x": `${position.x}%`,
                  "--y": `${position.y}%`,
                  "--scale": scale,
                  "--rotate": `${rotation}deg`
                } as CSSProperties & Record<string, string | number>
              }
            />
          );
        })}
      </section>

      <footer>따뜻한 말과 행동은 마음을 부드럽게 만들어요.</footer>
    </main>
  );
}
