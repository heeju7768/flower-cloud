import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FlowerEntry = {
  id: string;
  order: number;
  studentName: string;
  flowerName: string;
  createdAt: string;
};

const store = globalThis as typeof globalThis & {
  __maeumFlowers?: FlowerEntry[];
};

function getFlowers() {
  if (!store.__maeumFlowers) store.__maeumFlowers = [];
  return store.__maeumFlowers;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[<>`"'\\{}[\]|~^]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function hasBlockedText(value: string) {
  const normalized = value.toLowerCase().replace(/\s/g, "");
  const blockedWords = ["바보", "멍청", "죽어", "싫어", "꺼져", "fuck", "shit", "개새", "병신"];
  return blockedWords.some(word => normalized.includes(word));
}

function withCounts(items: FlowerEntry[]) {
  const counts = new Map<string, number>();
  items.forEach(item => {
    counts.set(item.flowerName, (counts.get(item.flowerName) || 0) + 1);
  });
  return items.map(item => ({
    ...item,
    count: counts.get(item.flowerName) || 1
  }));
}

export async function GET() {
  return NextResponse.json({ flowers: withCounts(getFlowers()) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { studentName?: string; flowerName?: string };
    const studentName = cleanText(body.studentName, 5);
    const flowerName = cleanText(body.flowerName, 10);

    if (!studentName || !flowerName || hasBlockedText(studentName) || hasBlockedText(flowerName)) {
      return NextResponse.json({ ok: false, message: "다시 한번 꽃을 피워주세요." }, { status: 400 });
    }

    const flowers = getFlowers();
    flowers.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      order: flowers.length + 1,
      studentName,
      flowerName,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, message: "다시 한번 꽃을 피워주세요." }, { status: 400 });
  }
}

export async function DELETE() {
  store.__maeumFlowers = [];
  return NextResponse.json({ ok: true });
}
