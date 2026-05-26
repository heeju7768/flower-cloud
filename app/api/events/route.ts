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
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ flowers: withCounts(getFlowers()) })}\n\n`));
      };

      send();
      interval = setInterval(send, 1000);
    },
    cancel() {
      if (interval) clearInterval(interval);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
