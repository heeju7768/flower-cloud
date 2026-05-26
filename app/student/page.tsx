"use client";

import { FormEvent, useState } from "react";

function cleanValue(value: string, maxLength: number) {
  return value
    .replace(/[<>`"'\\{}[\]|~^]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export default function StudentPage() {
  const [studentName, setStudentName] = useState("");
  const [flowerName, setFlowerName] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submitFlower(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedStudentName = cleanValue(studentName, 5);
    const cleanedFlowerName = cleanValue(flowerName, 10);
    setStudentName(cleanedStudentName);
    setFlowerName(cleanedFlowerName);

    if (!cleanedStudentName || !cleanedFlowerName) {
      setIsError(true);
      setMessage("다시 한번 꽃을 피워주세요.");
      return;
    }

    try {
      const response = await fetch("/api/flowers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: cleanedStudentName,
          flowerName: cleanedFlowerName
        })
      });

      if (!response.ok) throw new Error("submit failed");

      setIsError(false);
      setMessage("마음꽃이 피었습니다.");
      setFlowerName("");
      window.setTimeout(() => setMessage(""), 2200);
    } catch {
      setIsError(true);
      setMessage("다시 한번 꽃을 피워주세요.");
    }
  }

  return (
    <main className="student-page">
      <section className="student-shell">
        <div className="student-panel" aria-labelledby="page-title">
          <div className="story-badge">마음꽃 워드클라우드</div>
          <h1 id="page-title">돼지의 마음을 부드럽게 만들어 줄 꽃을 피워주세요.</h1>

          <form className="flower-form" autoComplete="off" onSubmit={submitFlower}>
            <label>
              <span>이름</span>
              <input
                value={studentName}
                onChange={event => setStudentName(event.target.value.slice(0, 5))}
                type="text"
                maxLength={5}
                placeholder="예: 민준"
                required
              />
            </label>

            <label>
              <span>꽃 이름</span>
              <input
                value={flowerName}
                onChange={event => setFlowerName(event.target.value.slice(0, 10))}
                type="text"
                maxLength={10}
                placeholder="예: 괜찮아꽃"
                required
              />
            </label>

            <button type="submit">꽃 피우기</button>
          </form>

          <p className={`form-message${isError ? " is-error" : ""}`} role="status" aria-live="polite">
            {message}
          </p>
        </div>
      </section>

      <footer>따뜻한 말과 행동은 마음을 부드럽게 만들어요.</footer>
    </main>
  );
}
