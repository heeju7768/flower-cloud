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
};

type FlowerGroup = {
  flowerName: string;
  count: number;
  studentNames: string[];
  firstOrder: number;
};

const palette = ["#f8c6d0", "#f7d49f", "#f6e58b", "#bee5c8", "#bfe4f6", "#d8c9f2", "#ffd1b3"];

function hashText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function formatDateForFile() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function groupFlowers(entries: FlowerEntry[]) {
  const grouped = new Map<string, FlowerGroup>();

  entries.forEach(entry => {
    if (!grouped.has(entry.flowerName)) {
      grouped.set(entry.flowerName, {
        flowerName: entry.flowerName,
        count: entry.count,
        studentNames: [],
        firstOrder: entry.order
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
  const baseY = 16 + row * 18;
  const wiggleX = (hash % 15) - 7;
  const wiggleY = ((hash >> 3) % 11) - 5;

  return {
    x: Math.max(10, Math.min(90, baseX + wiggleX)),
    y: Math.max(12, Math.min(88, baseY + wiggleY))
  };
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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";

  [...text].forEach(char => {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines.slice(0, 3);
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
    const scale = 2;
    canvas.width = Math.max(1200, Math.floor(rect.width * scale));
    canvas.height = Math.max(760, Math.floor(rect.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, "#fff9ed");
    background.addColorStop(0.62, "#f4f9ed");
    background.addColorStop(1, "#eef8f9");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#544338";
    ctx.textAlign = "center";
    ctx.font = "700 46px Malgun Gothic, Arial";
    ctx.fillText("우리 반 마음꽃", canvas.width / 2, 78);

    groups.forEach((group, index) => {
      const position = positionFor(group, index);
      const size = Math.min(250, 126 + group.count * 18);
      const width = size * (canvas.width / rect.width);
      const height = size * 0.82 * (canvas.height / rect.height);
      const x = (position.x / 100) * canvas.width - width / 2;
      const y = (position.y / 100) * canvas.height - height / 2 + 36;
      const color = palette[hashText(group.flowerName) % palette.length];

      ctx.fillStyle = color;
      drawRoundedRect(ctx, x, y, width, height, Math.min(width, height) * 0.28);
      ctx.fillStyle = "#523d33";
      ctx.font = `900 ${Math.min(48, 25 + group.count * 3)}px Malgun Gothic, Arial`;
      wrapText(ctx, group.flowerName, width * 0.82).forEach((line, lineIndex, lines) => {
        ctx.fillText(line, x + width / 2, y + height * 0.45 + (lineIndex - (lines.length - 1) / 2) * 42);
      });
      ctx.fillStyle = "rgba(82, 61, 51, 0.78)";
      ctx.font = "700 22px Malgun Gothic, Arial";
      ctx.fillText(group.studentNames.slice(0, 3).join(", "), x + width / 2, y + height * 0.78);
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
          const size = Math.min(250, 126 + group.count * 18);
          const color = palette[hashText(group.flowerName) % palette.length];
          const rotation = (hashText(`${group.flowerName}-turn`) % 18) - 9;
          const names = group.studentNames.slice(0, 5).join(", ");
          const extra = group.studentNames.length > 5 ? ` 외 ${group.studentNames.length - 5}명` : "";

          return (
            <button
              key={group.flowerName}
              type="button"
              className={`flower-card${highlightedName === group.flowerName ? " is-highlighted" : ""}`}
              style={{
                "--x": `${position.x}%`,
                "--y": `${position.y}%`,
                "--size": `${size}px`,
                "--count": group.count,
                "--card-color": color,
                "--rotate": `${rotation}deg`
              } as CSSProperties & Record<string, string | number>}
              aria-label={`${group.flowerName}, ${group.count}번 피었습니다`}
              onClick={() => setHighlightedName(highlightedName === group.flowerName ? "" : group.flowerName)}
            >
              <span className="flower-center">
                <span className="flower-name">{group.flowerName}</span>
                <span className="student-names">
                  {names}
                  {extra}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <footer>따뜻한 말과 행동은 마음을 부드럽게 만들어요.</footer>
    </main>
  );
}
